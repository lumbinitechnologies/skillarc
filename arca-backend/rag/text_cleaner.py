import re


def clean_text(raw_text: str) -> str:
    """Normalize whitespace, strip control characters, and collapse
    excessive blank lines so chunking produces cleaner segments."""
    if not raw_text:
        return ""

    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove non-printable / control characters (keep newlines and tabs)
    text = re.sub(r"[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]", "", text)

    # Collapse 3+ consecutive newlines into 2 (paragraph break)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Collapse multiple spaces/tabs into a single space
    text = re.sub(r"[ \t]{2,}", " ", text)

    # Trim trailing whitespace on each line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text.strip()
