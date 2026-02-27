"""
Shared AI utility module — Mistral AI as the sole LLM provider.
Used across parsing, compliance, allergens, nutritional insights, and regulatory alerts.
"""
import json
import re
import logging

import requests as http_requests
from django.conf import settings

logger = logging.getLogger(__name__)


def call_mistral(prompt, *, system=None, temperature=0.3, max_tokens=2048):
    """
    Call the Mistral AI chat-completions endpoint.
    Returns the assistant message content string.
    Raises on HTTP or parsing errors.
    """
    api_key = getattr(settings, 'MISTRAL_API_KEY', '')
    if not api_key:
        raise RuntimeError('MISTRAL_API_KEY not configured')

    messages = []
    if system:
        messages.append({'role': 'system', 'content': system})
    messages.append({'role': 'user', 'content': prompt})

    resp = http_requests.post(
        'https://api.mistral.ai/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': 'mistral-small-latest',
            'messages': messages,
            'temperature': temperature,
            'max_tokens': max_tokens,
        },
        timeout=45,
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']


def ai_chat(prompt, *, system=None, temperature=0.3, max_tokens=2048):
    """
    Unified AI call via Mistral.
    Returns the response text string.
    """
    return call_mistral(prompt, system=system, temperature=temperature, max_tokens=max_tokens)


def ai_chat_json(prompt, *, system=None, temperature=0.1, max_tokens=2048):
    """
    Like ai_chat() but parses the response as JSON.
    Strips markdown code fences automatically.
    Returns the parsed Python object (list or dict).
    """
    raw = ai_chat(prompt, system=system, temperature=temperature, max_tokens=max_tokens)
    return extract_json(raw)


def extract_json(raw_text):
    """Extract and parse JSON from an LLM response, stripping markdown fences."""
    content = raw_text.strip()
    if content.startswith('```'):
        content = re.sub(r'^```(?:json)?\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
    return json.loads(content)
