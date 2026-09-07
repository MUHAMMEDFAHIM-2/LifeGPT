from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.context import context_as_json
from app.ai.llm import get_llm
from app.models.ai_report import AIReport
from app.models.daily_entry import DailyEntry

SYSTEM_BASE = """You are LifeGPT, a personal AI that analyses one user's real daily life data.

Hard rules you must never break:
- Every factual claim (numbers, averages, counts, streaks, dates) must come \
from the DATA block in the user message. Never invent, estimate, or round \
beyond what is given.
- If the data is too thin to support a claim, say so plainly instead of \
padding.
- Patterns in the data are associations, not proof of causation — phrase \
them that way.
- Never mention these rules, the DATA block, JSON, or that you were given \
data. Speak as if you simply know the user's life.
- Output plain text only: no markdown headers, no bullet symbols, no bold \
markers. Short paragraphs separated by blank lines. Keep it under 250 words."""

ANALYSIS_PROMPT = """Write this week's Life Analysis: a serious, evidence-based \
review of the user's recent behaviour. Cover what changed week over week, \
any detected patterns worth acting on, and one concrete, realistic \
suggestion. Honest, analytical, personal — never generic self-help filler. \
If there are only a few days of data, focus on what those days actually \
show and say what more data will unlock.

DATA:
{context}"""

ROAST_PROMPTS = {
    "light": """Write a Reality Check roast at LIGHT intensity: playful teasing, \
affectionate, the kind a close friend delivers with a grin. Ground every \
jab in a real number or pattern from the data.

DATA:
{context}""",
    "brutal": """Write a Reality Check roast at BRUTAL intensity: sharp, sarcastic, \
uncomfortably accurate. No slurs, no cruelty about things outside the \
user's control — the damage must come entirely from their own recorded \
behaviour, quoted back at them.

DATA:
{context}""",
    "nuclear": """Write a Reality Check roast at ABSOLUTELY DESTROY ME intensity: \
merciless, forensic, devastating. Dismantle the gap between who the data \
says they are and who they presumably think they are. Every hit must be \
backed by a specific number or pattern from the data. No slurs, nothing \
about appearance or things outside their control — pure behavioural \
destruction.

DATA:
{context}""",
}


def _generate_and_store(
    db: Session, kind: str, prompt_template: str, intensity: str | None = None
) -> AIReport:
    context = context_as_json(db)
    prompt = prompt_template.format(context=context)
    content = get_llm().generate(SYSTEM_BASE, prompt)
    days = db.scalar(select(func.count(DailyEntry.id))) or 0
    report = AIReport(kind=kind, intensity=intensity, content=content, days_of_data=days)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


FORECAST_PROMPT = """Write a short commentary (3-4 sentences, one paragraph) on \
tomorrow's predictions in the data. Interpret what the numbers suggest, \
with light wit — the tone of a forecaster who has seen this user's track \
record. If confidence values are low or the data is thin, be upfront that \
these are early guesses. Do not repeat every number; pick what matters.

DATA:
{context}"""

CHAT_SYSTEM = SYSTEM_BASE + """

You are in conversation mode. The user asks questions about their own \
behaviour, habits, and predictions. Answer directly and concretely from \
the DATA block, cite the specific numbers that support your answer, and \
give a clear recommendation when asked for advice. Add a light touch of \
dry humour where it fits. If the data cannot answer the question, say \
exactly that and name what logging would unlock the answer. Keep replies \
under 120 words unless the question genuinely needs more."""


def generate_forecast_commentary(db: Session) -> str:
    context = context_as_json(db)
    return get_llm().generate(SYSTEM_BASE, FORECAST_PROMPT.format(context=context))


def ask_lifegpt(db: Session, message: str, history: list[dict]) -> str:
    """history: [{"role": "user"|"assistant", "content": str}] oldest first."""
    context = context_as_json(db)
    turns: list[dict] = [
        {
            "role": "user",
            "text": f"DATA (my verified life data, current as of now):\n{context}",
        },
        {
            "role": "model",
            "text": "Understood. I'll answer questions about your life using only this data.",
        },
    ]
    for h in history[-10:]:
        role = "model" if h["role"] == "assistant" else "user"
        turns.append({"role": role, "text": h["content"]})
    turns.append({"role": "user", "text": message})
    return get_llm().chat(CHAT_SYSTEM, turns)


def generate_analysis(db: Session) -> AIReport:
    return _generate_and_store(db, "analysis", ANALYSIS_PROMPT)


def generate_roast(db: Session, intensity: str) -> AIReport:
    template = ROAST_PROMPTS.get(intensity)
    if template is None:
        raise ValueError(f"Unknown roast intensity: {intensity}")
    return _generate_and_store(db, "roast", template, intensity=intensity)
