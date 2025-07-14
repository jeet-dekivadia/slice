import re

def parse_edit_prompt(prompt: str):
    # Simple rule-based parser for 'cut from X to Y seconds'
    match = re.search(r'cut from (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?) seconds', prompt, re.IGNORECASE)
    if match:
        start = float(match.group(1))
        end = float(match.group(2))
        return {"action": "cut", "start": start, "end": end}
    # Add more rules as needed
    return {"action": "noop", "details": {}}