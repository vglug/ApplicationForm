"""
Widget Agent - AI-powered widget configuration generation
Supports multiple AI providers: Claude (Anthropic), OpenAI, and Local (Ollama)
"""
import os
import json
import re
import requests

# Schema information for the LLM
SCHEMA_INFO = """
Available Tables and Columns:

1. application
   - id (integer): Primary key
   - candidate_id (string): Unique candidate identifier
   - status (string): Application status - values: 'submitted', 'reviewed', 'approved', 'rejected'
   - created_at (datetime): When application was created
   - updated_at (datetime): When application was last updated

2. basic_info
   - candidate_id (string): Links to application
   - full_name (string): Applicant's full name
   - gender (string): Gender - values: 'Male', 'Female', 'Other'
   - dob (date): Date of birth
   - email (string): Email address
   - contact (string): Phone number
   - differently_abled (boolean): Whether applicant is differently abled
   - has_laptop (boolean): Whether applicant has a laptop
   - laptop_ram (string): Laptop RAM if has laptop
   - considered (boolean): Whether application is considered by panel
   - selected (boolean): Whether applicant is selected
   - shortlisted (boolean): Whether applicant is shortlisted
   - appeared_for_one_to_one (boolean): Whether applicant appeared for one-to-one interview

3. educational_info
   - candidate_id (string): Links to application
   - college_name (string): Name of college
   - degree (string): Degree name (e.g., 'B.E', 'B.Tech', 'B.Sc')
   - department (string): Department name
   - year (string): Year of study (e.g., '1st Year', '2nd Year')
   - tamil_medium (boolean): Whether studied in Tamil medium
   - six_to_8_govt_school (boolean): Studied in govt school for classes 6-8
   - nine_to_10_govt_school (boolean): Studied in govt school for classes 9-10
   - eleven_to_12_govt_school (boolean): Studied in govt school for classes 11-12
   - received_scholarship (boolean): Whether receiving scholarship
   - transport_mode (string): Mode of transport to college
   - vglug_applied_before (string): Whether applied to VGLUG before

4. family_info
   - candidate_id (string): Links to application
   - family_environment (string): Family environment type
   - single_parent_info (string): Single parent information if applicable
   - family_members_count (integer): Number of family members
   - earning_members_count (integer): Number of earning members

5. income_info
   - candidate_id (string): Links to application
   - total_family_income (string): Total family income
   - house_ownership (string): Type of house ownership (e.g., 'Own', 'Rent')
   - district (string): District name
   - pincode (string): Pincode

6. course_info
   - candidate_id (string): Links to application
   - preferred_course (string): Preferred course (e.g., 'Linux', 'Python', 'Web Development')
   - heard_about_vglug (boolean): Whether heard about VGLUG
   - participated_in_vglug_events (boolean): Whether participated in VGLUG events before

Allowed Aggregations: COUNT, SUM, AVG, MIN, MAX
Allowed Operators: =, !=, <, >, <=, >=, LIKE, NOT LIKE, IN, NOT IN, IS NULL, IS NOT NULL
"""

SYSTEM_PROMPT = f"""You are a widget configuration generator for a VGLUG application form admin dashboard.

Your task is to convert natural language queries into widget configurations that can be used to create charts and tables.

{SCHEMA_INFO}

Widget Configuration Structure:
{{
  "title": "Widget title",
  "description": "Brief description",
  "widget_type": "pie|bar|line|number|table",
  "config_json": {{
    "data_source": {{
      "base_table": "table_name",
      "joins": ["table_name1", "table_name2"]  // Optional, tables to join
    }},
    "fields": [
      {{
        "table": "table_name",
        "column": "column_name",
        "alias": "display_name",
        "aggregation": null|"COUNT"|"SUM"|"AVG"|"MIN"|"MAX"
      }}
    ],
    "conditions": [
      {{
        "logic": "AND"|"OR",
        "table": "table_name",
        "column": "column_name",
        "operator": "=|!=|<|>|LIKE|IN|IS NULL|...",
        "value": "value"
      }}
    ],
    "group_by": ["table.column"],  // Required for aggregations
    "order_by": [{{"column": "alias", "direction": "ASC|DESC"}}],
    "limit": 100,
    "chart_config": {{
      "name_field": "field_alias_for_labels",
      "value_field": "field_alias_for_values",
      "colors": ["#00BAED", "#28a745", "#dc3545"],
      "show_legend": true,
      "show_labels": true
    }}
  }},
  "width": "col-md-6"  // col-md-4, col-md-6, col-md-8, col-md-12
}}

Guidelines:
1. For pie charts, bar charts, and line charts: You MUST include TWO fields:
   - First field: The label/category field WITHOUT aggregation (e.g., gender, college_name)
   - Second field: A COUNT aggregation on any column (typically id or the same column)
   Example for gender pie chart:
   "fields": [
     {{"table": "basic_info", "column": "gender", "alias": "gender", "aggregation": null}},
     {{"table": "basic_info", "column": "id", "alias": "count", "aggregation": "COUNT"}}
   ],
   "group_by": ["basic_info.gender"],
   "chart_config": {{"name_field": "gender", "value_field": "count", ...}}

2. For number cards: Use a single COUNT or SUM aggregation
3. For tables: Select multiple fields without aggregation, or with aggregations and group_by
4. Always include appropriate joins when accessing related tables
5. Use simple lowercase aliases like "gender", "count", "college" - these must match name_field and value_field exactly
6. Choose appropriate widget_type based on the query intent
7. Set appropriate width based on data complexity
8. The chart_config name_field and value_field must EXACTLY match the aliases in the fields array

IMPORTANT: Return ONLY valid JSON, no explanations or markdown code blocks.
"""


def generate_with_ollama(prompt: str, ollama_url: str = None, model: str = None) -> dict:
    """Generate widget config using local Ollama instance"""
    url = ollama_url or os.getenv('OLLAMA_URL', 'http://localhost:11434')
    model_name = model or os.getenv('OLLAMA_MODEL', 'qwen2.5-coder:7b')

    try:
        response = requests.post(
            f"{url}/api/generate",
            json={
                "model": model_name,
                "prompt": f"{SYSTEM_PROMPT}\n\nUser request: {prompt}\n\nReturn ONLY the JSON configuration:",
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 2000
                }
            },
            timeout=120
        )

        if response.status_code != 200:
            return {
                'success': False,
                'error': f'Ollama request failed: {response.text}'
            }

        result = response.json()
        content = result.get('response', '').strip()

        return parse_llm_response(content)

    except requests.exceptions.ConnectionError:
        return {
            'success': False,
            'error': f'Cannot connect to Ollama at {url}. Make sure Ollama is running.'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Ollama generation failed: {str(e)}'
        }


def generate_with_anthropic(prompt: str, api_key: str) -> dict:
    """Generate widget config using Claude (Anthropic)"""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"Create a widget configuration for: {prompt}"}
            ]
        )

        content = response.content[0].text.strip()
        return parse_llm_response(content)

    except Exception as e:
        return {
            'success': False,
            'error': f'Claude API error: {str(e)}'
        }


def generate_with_openai(prompt: str, api_key: str) -> dict:
    """Generate widget config using OpenAI"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Create a widget configuration for: {prompt}"}
            ],
            temperature=0.3,
            max_tokens=2000
        )

        content = response.choices[0].message.content.strip()
        return parse_llm_response(content)

    except Exception as e:
        return {
            'success': False,
            'error': f'OpenAI API error: {str(e)}'
        }


def parse_llm_response(content: str) -> dict:
    """Parse and validate LLM response JSON"""
    try:
        # Try to extract JSON if wrapped in markdown code blocks
        if '```json' in content:
            match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
            if match:
                content = match.group(1)
        elif '```' in content:
            match = re.search(r'```\s*(.*?)\s*```', content, re.DOTALL)
            if match:
                content = match.group(1)

        # Parse the JSON
        config = json.loads(content)

        # Validate required fields
        required_fields = ['title', 'widget_type', 'config_json']
        for field in required_fields:
            if field not in config:
                return {
                    'success': False,
                    'error': f'Missing required field: {field}'
                }

        # Validate widget_type
        valid_types = ['pie', 'bar', 'line', 'number', 'table']
        if config['widget_type'] not in valid_types:
            return {
                'success': False,
                'error': f'Invalid widget_type. Must be one of: {valid_types}'
            }

        return {
            'success': True,
            'config': config
        }

    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'Failed to parse AI response as JSON: {str(e)}',
            'raw_response': content
        }


def generate_widget_config(prompt: str, provider: str = 'local', api_key: str = None,
                          ollama_url: str = None, ollama_model: str = None) -> dict:
    """
    Generate widget configuration from natural language prompt

    Args:
        prompt: Natural language description of the desired widget
        provider: AI provider - 'local' (Ollama), 'anthropic' (Claude), or 'openai'
        api_key: API key for Anthropic or OpenAI (not needed for local)
        ollama_url: URL for Ollama server (default: http://localhost:11434)
        ollama_model: Ollama model name (default: qwen2.5-coder:7b)

    Returns:
        dict with widget configuration or error
    """
    if provider == 'local':
        return generate_with_ollama(prompt, ollama_url, ollama_model)
    elif provider == 'anthropic':
        key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not key:
            return {
                'success': False,
                'error': 'Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable or provide it in the input field.'
            }
        return generate_with_anthropic(prompt, key)
    elif provider == 'openai':
        key = api_key or os.getenv('OPENAI_API_KEY')
        if not key:
            return {
                'success': False,
                'error': 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable or provide it in the input field.'
            }
        return generate_with_openai(prompt, key)
    else:
        return {
            'success': False,
            'error': f'Unknown provider: {provider}. Use "local", "anthropic", or "openai".'
        }


def refine_with_ollama(current_config: dict, feedback: str, ollama_url: str = None, model: str = None) -> dict:
    """Refine widget config using local Ollama instance"""
    url = ollama_url or os.getenv('OLLAMA_URL', 'http://localhost:11434')
    model_name = model or os.getenv('OLLAMA_MODEL', 'qwen2.5-coder:7b')

    refinement_prompt = f"""{SYSTEM_PROMPT}

Current widget configuration:
{json.dumps(current_config, indent=2)}

User feedback: {feedback}

Please modify the widget configuration based on the feedback. Return ONLY the complete updated JSON configuration, no explanations."""

    try:
        response = requests.post(
            f"{url}/api/generate",
            json={
                "model": model_name,
                "prompt": refinement_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 2000
                }
            },
            timeout=120
        )

        if response.status_code != 200:
            return {
                'success': False,
                'error': f'Ollama request failed: {response.text}'
            }

        result = response.json()
        content = result.get('response', '').strip()

        return parse_llm_response(content)

    except requests.exceptions.ConnectionError:
        return {
            'success': False,
            'error': f'Cannot connect to Ollama at {url}. Make sure Ollama is running.'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Ollama refinement failed: {str(e)}'
        }


def refine_with_anthropic(current_config: dict, feedback: str, api_key: str) -> dict:
    """Refine widget config using Claude (Anthropic)"""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        refinement_prompt = f"""Current widget configuration:
{json.dumps(current_config, indent=2)}

User feedback: {feedback}

Please modify the widget configuration based on the feedback. Return ONLY the complete updated JSON configuration, no explanations or markdown."""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": refinement_prompt}
            ]
        )

        content = response.content[0].text.strip()
        return parse_llm_response(content)

    except Exception as e:
        return {
            'success': False,
            'error': f'Claude API error: {str(e)}'
        }


def refine_with_openai(current_config: dict, feedback: str, api_key: str) -> dict:
    """Refine widget config using OpenAI"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        refinement_prompt = f"""Current widget configuration:
{json.dumps(current_config, indent=2)}

User feedback: {feedback}

Please modify the widget configuration based on the feedback. Return ONLY the complete updated JSON configuration."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": refinement_prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )

        content = response.choices[0].message.content.strip()
        return parse_llm_response(content)

    except Exception as e:
        return {
            'success': False,
            'error': f'OpenAI API error: {str(e)}'
        }


def refine_widget_config(current_config: dict, feedback: str, provider: str = 'local',
                        api_key: str = None, ollama_url: str = None, ollama_model: str = None) -> dict:
    """
    Refine an existing widget configuration based on user feedback

    Args:
        current_config: Current widget configuration
        feedback: User feedback for modifications
        provider: AI provider - 'local' (Ollama), 'anthropic' (Claude), or 'openai'
        api_key: API key for Anthropic or OpenAI
        ollama_url: URL for Ollama server
        ollama_model: Ollama model name

    Returns:
        dict with refined widget configuration or error
    """
    if provider == 'local':
        return refine_with_ollama(current_config, feedback, ollama_url, ollama_model)
    elif provider == 'anthropic':
        key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not key:
            return {
                'success': False,
                'error': 'Anthropic API key not configured'
            }
        return refine_with_anthropic(current_config, feedback, key)
    elif provider == 'openai':
        key = api_key or os.getenv('OPENAI_API_KEY')
        if not key:
            return {
                'success': False,
                'error': 'OpenAI API key not configured'
            }
        return refine_with_openai(current_config, feedback, key)
    else:
        return {
            'success': False,
            'error': f'Unknown provider: {provider}'
        }


def check_ollama_status(ollama_url: str = None) -> dict:
    """Check if Ollama is running and has the required model"""
    url = ollama_url or os.getenv('OLLAMA_URL', 'http://localhost:11434')
    model = os.getenv('OLLAMA_MODEL', 'qwen2.5-coder:7b')

    try:
        # Check if Ollama is running
        response = requests.get(f"{url}/api/tags", timeout=5)
        if response.status_code != 200:
            return {
                'running': False,
                'error': 'Ollama server not responding'
            }

        # Check if model is available
        models = response.json().get('models', [])
        model_names = [m.get('name', '') for m in models]

        # Check for exact match or partial match (model:latest)
        has_model = any(model in name or name.startswith(model.split(':')[0]) for name in model_names)

        return {
            'running': True,
            'has_model': has_model,
            'model': model,
            'available_models': model_names
        }

    except requests.exceptions.ConnectionError:
        return {
            'running': False,
            'error': f'Cannot connect to Ollama at {url}'
        }
    except Exception as e:
        return {
            'running': False,
            'error': str(e)
        }
