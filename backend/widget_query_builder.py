"""
Widget Query Builder - Safe dynamic query generation for custom widgets
"""
from sqlalchemy import func, desc, asc, and_, or_
from models import db, Application, BasicInfo, EducationalInfo, FamilyInfo, IncomeInfo, CourseInfo

# Mapping of table names to model classes
TABLE_MODELS = {
    'application': Application,
    'basic_info': BasicInfo,
    'educational_info': EducationalInfo,
    'family_info': FamilyInfo,
    'income_info': IncomeInfo,
    'course_info': CourseInfo
}

# Allowed columns per table (whitelist for security)
ALLOWED_COLUMNS = {
    'application': ['id', 'candidate_id', 'status', 'created_at', 'updated_at'],
    'basic_info': ['id', 'candidate_id', 'full_name', 'gender', 'dob', 'email', 'contact',
                   'differently_abled', 'has_laptop', 'laptop_ram', 'laptop_processor',
                   'considered', 'selected', 'shortlisted', 'contact_as_whatsapp',
                   'appeared_for_one_to_one'],
    'educational_info': ['id', 'candidate_id', 'college_name', 'degree', 'department', 'year',
                        'tamil_medium', 'six_to_8_govt_school', 'nine_to_10_govt_school',
                        'eleven_to_12_govt_school', 'received_scholarship', 'transport_mode',
                        'vglug_applied_before', 'present_work'],
    'family_info': ['id', 'candidate_id', 'family_environment', 'single_parent_info',
                   'family_members_count', 'earning_members_count'],
    'income_info': ['id', 'candidate_id', 'total_family_income', 'house_ownership',
                   'district', 'pincode', 'own_land_size'],
    'course_info': ['id', 'candidate_id', 'preferred_course', 'heard_about_vglug',
                   'participated_in_vglug_events']
}

ALLOWED_AGGREGATIONS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']
ALLOWED_OPERATORS = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL']


def get_widget_metadata():
    """Get available tables and fields for widget builder"""
    return {
        'tables': {
            'application': {
                'display_name': 'Application',
                'fields': [
                    {'name': 'id', 'type': 'integer', 'display': 'ID'},
                    {'name': 'candidate_id', 'type': 'string', 'display': 'Candidate ID'},
                    {'name': 'status', 'type': 'string', 'display': 'Status', 'values': ['submitted', 'reviewed', 'approved', 'rejected']},
                    {'name': 'created_at', 'type': 'datetime', 'display': 'Created At'},
                    {'name': 'updated_at', 'type': 'datetime', 'display': 'Updated At'}
                ]
            },
            'basic_info': {
                'display_name': 'Basic Info',
                'join_column': 'candidate_id',
                'fields': [
                    {'name': 'full_name', 'type': 'string', 'display': 'Full Name'},
                    {'name': 'gender', 'type': 'string', 'display': 'Gender', 'values': ['Male', 'Female', 'Other']},
                    {'name': 'dob', 'type': 'date', 'display': 'Date of Birth'},
                    {'name': 'email', 'type': 'string', 'display': 'Email'},
                    {'name': 'contact', 'type': 'string', 'display': 'Contact'},
                    {'name': 'differently_abled', 'type': 'boolean', 'display': 'Differently Abled'},
                    {'name': 'has_laptop', 'type': 'boolean', 'display': 'Has Laptop'},
                    {'name': 'laptop_ram', 'type': 'string', 'display': 'Laptop RAM'},
                    {'name': 'considered', 'type': 'boolean', 'display': 'Considered'},
                    {'name': 'selected', 'type': 'boolean', 'display': 'Selected'},
                    {'name': 'shortlisted', 'type': 'boolean', 'display': 'Shortlisted'},
                    {'name': 'appeared_for_one_to_one', 'type': 'boolean', 'display': 'Appeared for One-to-One'}
                ]
            },
            'educational_info': {
                'display_name': 'Educational Info',
                'join_column': 'candidate_id',
                'fields': [
                    {'name': 'college_name', 'type': 'string', 'display': 'College Name'},
                    {'name': 'degree', 'type': 'string', 'display': 'Degree'},
                    {'name': 'department', 'type': 'string', 'display': 'Department'},
                    {'name': 'year', 'type': 'string', 'display': 'Year of Study'},
                    {'name': 'tamil_medium', 'type': 'boolean', 'display': 'Tamil Medium'},
                    {'name': 'six_to_8_govt_school', 'type': 'boolean', 'display': '6-8 Govt School'},
                    {'name': 'nine_to_10_govt_school', 'type': 'boolean', 'display': '9-10 Govt School'},
                    {'name': 'eleven_to_12_govt_school', 'type': 'boolean', 'display': '11-12 Govt School'},
                    {'name': 'received_scholarship', 'type': 'boolean', 'display': 'Received Scholarship'},
                    {'name': 'transport_mode', 'type': 'string', 'display': 'Transport Mode'},
                    {'name': 'vglug_applied_before', 'type': 'string', 'display': 'Applied Before'}
                ]
            },
            'family_info': {
                'display_name': 'Family Info',
                'join_column': 'candidate_id',
                'fields': [
                    {'name': 'family_environment', 'type': 'string', 'display': 'Family Environment'},
                    {'name': 'single_parent_info', 'type': 'string', 'display': 'Single Parent Info'},
                    {'name': 'family_members_count', 'type': 'integer', 'display': 'Family Members'},
                    {'name': 'earning_members_count', 'type': 'integer', 'display': 'Earning Members'}
                ]
            },
            'income_info': {
                'display_name': 'Income Info',
                'join_column': 'candidate_id',
                'fields': [
                    {'name': 'total_family_income', 'type': 'string', 'display': 'Total Family Income'},
                    {'name': 'house_ownership', 'type': 'string', 'display': 'House Ownership'},
                    {'name': 'district', 'type': 'string', 'display': 'District'},
                    {'name': 'pincode', 'type': 'string', 'display': 'Pincode'},
                    {'name': 'own_land_size', 'type': 'string', 'display': 'Own Land Size'}
                ]
            },
            'course_info': {
                'display_name': 'Course Info',
                'join_column': 'candidate_id',
                'fields': [
                    {'name': 'preferred_course', 'type': 'string', 'display': 'Preferred Course'},
                    {'name': 'heard_about_vglug', 'type': 'boolean', 'display': 'Heard About VGLUG'},
                    {'name': 'participated_in_vglug_events', 'type': 'boolean', 'display': 'Participated in Events'}
                ]
            }
        },
        'aggregations': [
            {'value': 'COUNT', 'label': 'Count'},
            {'value': 'SUM', 'label': 'Sum'},
            {'value': 'AVG', 'label': 'Average'},
            {'value': 'MIN', 'label': 'Minimum'},
            {'value': 'MAX', 'label': 'Maximum'}
        ],
        'operators': [
            {'value': '=', 'label': 'Equals'},
            {'value': '!=', 'label': 'Not Equals'},
            {'value': '<', 'label': 'Less Than'},
            {'value': '>', 'label': 'Greater Than'},
            {'value': '<=', 'label': 'Less or Equal'},
            {'value': '>=', 'label': 'Greater or Equal'},
            {'value': 'LIKE', 'label': 'Contains'},
            {'value': 'NOT LIKE', 'label': 'Not Contains'},
            {'value': 'IN', 'label': 'In List'},
            {'value': 'NOT IN', 'label': 'Not In List'},
            {'value': 'IS NULL', 'label': 'Is Empty'},
            {'value': 'IS NOT NULL', 'label': 'Is Not Empty'}
        ],
        'widget_types': [
            {'value': 'pie', 'label': 'Pie Chart'},
            {'value': 'bar', 'label': 'Bar Chart'},
            {'value': 'line', 'label': 'Line Chart'},
            {'value': 'number', 'label': 'Number Card'},
            {'value': 'table', 'label': 'Data Table'}
        ]
    }


def validate_column(table, column):
    """Validate that a column is allowed for the given table"""
    if table not in ALLOWED_COLUMNS:
        raise ValueError(f"Invalid table: {table}")
    if column not in ALLOWED_COLUMNS[table]:
        raise ValueError(f"Invalid column '{column}' for table '{table}'")
    return True


def execute_widget_query(config):
    """
    Execute a widget query based on the configuration

    Returns: {'data': [...], 'row_count': int}
    """
    data_source = config.get('data_source', {})
    fields = config.get('fields', [])
    conditions = config.get('conditions', [])
    group_by = config.get('group_by', [])
    order_by = config.get('order_by', [])
    limit = min(config.get('limit', 100), 1000)  # Max 1000 rows

    if not fields:
        raise ValueError("At least one field is required")

    # Validate base table
    base_table = data_source.get('base_table', 'application')
    if base_table not in TABLE_MODELS:
        raise ValueError(f"Invalid base table: {base_table}")

    # Collect all required tables
    required_tables = {base_table}
    joins = data_source.get('joins', [])
    for join_table in joins:
        if join_table in TABLE_MODELS:
            required_tables.add(join_table)

    # Add tables from fields
    for field in fields:
        table = field.get('table', base_table)
        if table in TABLE_MODELS:
            required_tables.add(table)

    # Add tables from conditions
    for condition in conditions:
        table = condition.get('table', base_table)
        if table in TABLE_MODELS:
            required_tables.add(table)

    # Build SELECT clause
    select_columns = []
    column_aliases = {}

    for field in fields:
        table = field.get('table', base_table)
        column = field.get('column')
        alias = field.get('alias', column)
        aggregation = field.get('aggregation')

        validate_column(table, column)

        model = TABLE_MODELS[table]
        col = getattr(model, column)

        if aggregation and aggregation in ALLOWED_AGGREGATIONS:
            if aggregation == 'COUNT':
                col = func.count(col)
            elif aggregation == 'SUM':
                col = func.sum(col)
            elif aggregation == 'AVG':
                col = func.avg(col)
            elif aggregation == 'MIN':
                col = func.min(col)
            elif aggregation == 'MAX':
                col = func.max(col)

        labeled_col = col.label(alias)
        select_columns.append(labeled_col)
        column_aliases[alias] = labeled_col

    # Determine the primary table for the query (first table in fields or base_table)
    primary_table = fields[0].get('table', base_table) if fields else base_table
    primary_model = TABLE_MODELS[primary_table]

    # Start building query - select from primary model
    query = db.session.query(*select_columns).select_from(primary_model)

    # Track which tables have been joined
    joined_tables = {primary_table}

    # Add joins for all other required tables
    for table_name in required_tables:
        if table_name not in joined_tables and table_name in TABLE_MODELS:
            join_model = TABLE_MODELS[table_name]
            # All info tables have candidate_id, so join on that
            query = query.outerjoin(join_model, primary_model.candidate_id == join_model.candidate_id)
            joined_tables.add(table_name)

    # Add WHERE conditions
    filter_clauses = []
    for condition in conditions:
        table = condition.get('table', base_table)
        column = condition.get('column')
        operator = condition.get('operator')
        value = condition.get('value')

        if not column or operator not in ALLOWED_OPERATORS:
            continue

        try:
            validate_column(table, column)
        except ValueError:
            continue

        model = TABLE_MODELS[table]
        col = getattr(model, column)

        if operator == '=':
            filter_clauses.append(col == value)
        elif operator == '!=':
            filter_clauses.append(col != value)
        elif operator == '<':
            filter_clauses.append(col < value)
        elif operator == '>':
            filter_clauses.append(col > value)
        elif operator == '<=':
            filter_clauses.append(col <= value)
        elif operator == '>=':
            filter_clauses.append(col >= value)
        elif operator == 'LIKE':
            filter_clauses.append(col.ilike(f'%{value}%'))
        elif operator == 'NOT LIKE':
            filter_clauses.append(~col.ilike(f'%{value}%'))
        elif operator == 'IN':
            if isinstance(value, list):
                filter_clauses.append(col.in_(value))
            elif isinstance(value, str):
                values = [v.strip() for v in value.split(',')]
                filter_clauses.append(col.in_(values))
        elif operator == 'NOT IN':
            if isinstance(value, list):
                filter_clauses.append(~col.in_(value))
            elif isinstance(value, str):
                values = [v.strip() for v in value.split(',')]
                filter_clauses.append(~col.in_(values))
        elif operator == 'IS NULL':
            filter_clauses.append(col.is_(None))
        elif operator == 'IS NOT NULL':
            filter_clauses.append(col.isnot(None))

    if filter_clauses:
        query = query.filter(and_(*filter_clauses))

    # Add GROUP BY
    group_by_columns = []
    for gb in group_by:
        if '.' in gb:
            parts = gb.split('.')
            if len(parts) == 2:
                table, column = parts
                try:
                    validate_column(table, column)
                    model = TABLE_MODELS[table]
                    group_by_columns.append(getattr(model, column))
                except ValueError:
                    continue
        else:
            # Assume it's an alias
            for field in fields:
                if field.get('alias') == gb or field.get('column') == gb:
                    table = field.get('table', base_table)
                    column = field.get('column')
                    try:
                        validate_column(table, column)
                        model = TABLE_MODELS[table]
                        group_by_columns.append(getattr(model, column))
                    except ValueError:
                        continue
                    break

    if group_by_columns:
        query = query.group_by(*group_by_columns)

    # Add ORDER BY
    for ob in order_by:
        col_name = ob.get('column')
        direction = ob.get('direction', 'ASC')

        # Check if it's an alias
        if col_name in column_aliases:
            if direction.upper() == 'DESC':
                query = query.order_by(desc(column_aliases[col_name]))
            else:
                query = query.order_by(asc(column_aliases[col_name]))
        else:
            # Try to find it in fields
            for field in fields:
                if field.get('column') == col_name or field.get('alias') == col_name:
                    table = field.get('table', base_table)
                    try:
                        validate_column(table, col_name if field.get('column') == col_name else field.get('column'))
                        model = TABLE_MODELS[table]
                        col = getattr(model, field.get('column'))
                        if direction.upper() == 'DESC':
                            query = query.order_by(desc(col))
                        else:
                            query = query.order_by(asc(col))
                    except ValueError:
                        continue
                    break

    # Apply limit
    if limit and limit > 0:
        query = query.limit(limit)

    # Execute and format results
    try:
        results = query.all()
    except Exception as e:
        raise ValueError(f"Query execution failed: {str(e)}")

    # Convert to list of dicts
    data = []
    for row in results:
        row_dict = {}
        for i, field in enumerate(fields):
            alias = field.get('alias', field.get('column'))
            value = row[i]
            # Handle special types
            if hasattr(value, 'isoformat'):
                value = value.isoformat()
            elif value is None:
                value = None
            row_dict[alias] = value
        data.append(row_dict)

    return {
        'data': data,
        'row_count': len(data)
    }


def get_widget_candidate_ids(config, limit=1000):
    """
    Get candidate IDs matching the widget query conditions
    This is used to navigate to submissions filtered by widget results

    Returns: list of candidate_ids
    """
    data_source = config.get('data_source', {})
    conditions = config.get('conditions', [])

    # Validate base table
    base_table = data_source.get('base_table', 'application')
    if base_table not in TABLE_MODELS:
        raise ValueError(f"Invalid base table: {base_table}")

    # Collect all required tables from conditions
    required_tables = {base_table}
    joins = data_source.get('joins', [])
    for join_table in joins:
        if join_table in TABLE_MODELS:
            required_tables.add(join_table)

    for condition in conditions:
        table = condition.get('table', base_table)
        if table in TABLE_MODELS:
            required_tables.add(table)

    # Determine primary model - prefer one that has candidate_id
    # If base_table is 'application', use Application.candidate_id
    # Otherwise use the base_table's candidate_id
    primary_model = TABLE_MODELS[base_table]

    # Select distinct candidate_ids
    query = db.session.query(primary_model.candidate_id.distinct()).select_from(primary_model)

    # Track joined tables
    joined_tables = {base_table}

    # Add joins for all required tables
    for table_name in required_tables:
        if table_name not in joined_tables and table_name in TABLE_MODELS:
            join_model = TABLE_MODELS[table_name]
            query = query.outerjoin(join_model, primary_model.candidate_id == join_model.candidate_id)
            joined_tables.add(table_name)

    # Apply WHERE conditions
    filter_clauses = []
    for condition in conditions:
        table = condition.get('table', base_table)
        column = condition.get('column')
        operator = condition.get('operator')
        value = condition.get('value')

        if not column or operator not in ALLOWED_OPERATORS:
            continue

        try:
            validate_column(table, column)
        except ValueError:
            continue

        model = TABLE_MODELS[table]
        col = getattr(model, column)

        if operator == '=':
            filter_clauses.append(col == value)
        elif operator == '!=':
            filter_clauses.append(col != value)
        elif operator == '<':
            filter_clauses.append(col < value)
        elif operator == '>':
            filter_clauses.append(col > value)
        elif operator == '<=':
            filter_clauses.append(col <= value)
        elif operator == '>=':
            filter_clauses.append(col >= value)
        elif operator == 'LIKE':
            filter_clauses.append(col.ilike(f'%{value}%'))
        elif operator == 'NOT LIKE':
            filter_clauses.append(~col.ilike(f'%{value}%'))
        elif operator == 'IN':
            if isinstance(value, list):
                filter_clauses.append(col.in_(value))
            elif isinstance(value, str):
                values = [v.strip() for v in value.split(',')]
                filter_clauses.append(col.in_(values))
        elif operator == 'NOT IN':
            if isinstance(value, list):
                filter_clauses.append(~col.in_(value))
            elif isinstance(value, str):
                values = [v.strip() for v in value.split(',')]
                filter_clauses.append(~col.in_(values))
        elif operator == 'IS NULL':
            filter_clauses.append(col.is_(None))
        elif operator == 'IS NOT NULL':
            filter_clauses.append(col.isnot(None))

    if filter_clauses:
        query = query.filter(and_(*filter_clauses))

    # Apply limit
    if limit and limit > 0:
        query = query.limit(limit)

    # Execute and extract candidate IDs
    try:
        results = query.all()
        return [row[0] for row in results if row[0]]
    except Exception as e:
        raise ValueError(f"Query execution failed: {str(e)}")


def get_widget_segment_candidate_ids(config, segment_field, segment_value, limit=1000):
    """
    Get candidate IDs matching the widget query conditions PLUS an additional filter
    for a specific segment (e.g., clicking on a pie chart segment)

    Args:
        config: The widget configuration
        segment_field: The field to filter on (e.g., 'gender')
        segment_value: The value to filter for (e.g., 'Male')
        limit: Maximum number of results

    Returns: list of candidate_ids
    """
    data_source = config.get('data_source', {})
    conditions = config.get('conditions', [])
    fields = config.get('fields', [])

    # Validate base table
    base_table = data_source.get('base_table', 'application')
    if base_table not in TABLE_MODELS:
        raise ValueError(f"Invalid base table: {base_table}")

    # Collect all required tables from conditions and fields
    required_tables = {base_table}
    joins = data_source.get('joins', [])
    for join_table in joins:
        if join_table in TABLE_MODELS:
            required_tables.add(join_table)

    for condition in conditions:
        table = condition.get('table', base_table)
        if table in TABLE_MODELS:
            required_tables.add(table)

    # Find the table for the segment field from the widget's fields config
    segment_table = None
    for field in fields:
        if field.get('column') == segment_field or field.get('alias') == segment_field:
            segment_table = field.get('table', base_table)
            # Use the actual column name, not alias
            if field.get('alias') == segment_field:
                segment_field = field.get('column')
            break

    # If not found in fields, check if it's a valid column in any joined table
    if not segment_table:
        for table_name in required_tables:
            if segment_field in ALLOWED_COLUMNS.get(table_name, []):
                segment_table = table_name
                break

    if not segment_table:
        raise ValueError(f"Segment field '{segment_field}' not found in widget configuration")

    required_tables.add(segment_table)

    # Determine primary model
    primary_model = TABLE_MODELS[base_table]

    # Select distinct candidate_ids
    query = db.session.query(primary_model.candidate_id.distinct()).select_from(primary_model)

    # Track joined tables
    joined_tables = {base_table}

    # Add joins for all required tables
    for table_name in required_tables:
        if table_name not in joined_tables and table_name in TABLE_MODELS:
            join_model = TABLE_MODELS[table_name]
            query = query.outerjoin(join_model, primary_model.candidate_id == join_model.candidate_id)
            joined_tables.add(table_name)

    # Apply original WHERE conditions from widget config
    filter_clauses = []
    for condition in conditions:
        table = condition.get('table', base_table)
        column = condition.get('column')
        operator = condition.get('operator')
        value = condition.get('value')

        if not column or operator not in ALLOWED_OPERATORS:
            continue

        try:
            validate_column(table, column)
        except ValueError:
            continue

        model = TABLE_MODELS[table]
        col = getattr(model, column)

        if operator == '=':
            filter_clauses.append(col == value)
        elif operator == '!=':
            filter_clauses.append(col != value)
        elif operator == '<':
            filter_clauses.append(col < value)
        elif operator == '>':
            filter_clauses.append(col > value)
        elif operator == '<=':
            filter_clauses.append(col <= value)
        elif operator == '>=':
            filter_clauses.append(col >= value)
        elif operator == 'LIKE':
            filter_clauses.append(col.ilike(f'%{value}%'))
        elif operator == 'NOT LIKE':
            filter_clauses.append(~col.ilike(f'%{value}%'))
        elif operator == 'IN':
            if isinstance(value, list):
                filter_clauses.append(col.in_(value))
            elif isinstance(value, str):
                values = [v.strip() for v in value.split(',')]
                filter_clauses.append(col.in_(values))
        elif operator == 'NOT IN':
            if isinstance(value, list):
                filter_clauses.append(~col.in_(value))
            elif isinstance(value, str):
                values = [v.strip() for v in value.split(',')]
                filter_clauses.append(~col.in_(values))
        elif operator == 'IS NULL':
            filter_clauses.append(col.is_(None))
        elif operator == 'IS NOT NULL':
            filter_clauses.append(col.isnot(None))

    # Add the segment filter condition
    try:
        validate_column(segment_table, segment_field)
        segment_model = TABLE_MODELS[segment_table]
        segment_col = getattr(segment_model, segment_field)

        # Handle different value types
        if segment_value is None or segment_value == 'null' or segment_value == 'None':
            filter_clauses.append(segment_col.is_(None))
        elif isinstance(segment_value, bool) or segment_value in ['true', 'false', 'True', 'False']:
            bool_val = segment_value if isinstance(segment_value, bool) else segment_value.lower() == 'true'
            filter_clauses.append(segment_col == bool_val)
        else:
            filter_clauses.append(segment_col == segment_value)
    except ValueError as e:
        raise ValueError(f"Invalid segment field: {e}")

    if filter_clauses:
        query = query.filter(and_(*filter_clauses))

    # Apply limit
    if limit and limit > 0:
        query = query.limit(limit)

    # Execute and extract candidate IDs
    try:
        results = query.all()
        return [row[0] for row in results if row[0]]
    except Exception as e:
        raise ValueError(f"Query execution failed: {str(e)}")
