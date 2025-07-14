import re

def parse_edit_prompt(prompt: str):
    # Cut: 'cut from X to Y seconds'
    match = re.search(r'cut from (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?) seconds', prompt, re.IGNORECASE)
    if match:
        start = float(match.group(1))
        end = float(match.group(2))
        return {"action": "cut", "start": start, "end": end}
    # Trim: 'trim to first X seconds' or 'trim from X to Y seconds'
    match = re.search(r'trim to first (\d+(?:\.\d+)?) seconds', prompt, re.IGNORECASE)
    if match:
        end = float(match.group(1))
        return {"action": "trim", "start": 0.0, "end": end}
    match = re.search(r'trim from (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?) seconds', prompt, re.IGNORECASE)
    if match:
        start = float(match.group(1))
        end = float(match.group(2))
        return {"action": "trim", "start": start, "end": end}
    # Mute: 'mute from X to Y seconds'
    match = re.search(r'mute from (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?) seconds', prompt, re.IGNORECASE)
    if match:
        start = float(match.group(1))
        end = float(match.group(2))
        return {"action": "mute", "start": start, "end": end}
    # Fade in: 'fade in for X seconds at start'
    match = re.search(r'fade in for (\d+(?:\.\d+)?) seconds at start', prompt, re.IGNORECASE)
    if match:
        duration = float(match.group(1))
        return {"action": "fade_in", "duration": duration}
    # Add more rules as needed
    return {"action": "noop", "details": {}}