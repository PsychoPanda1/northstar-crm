const FIELD_TYPES = new Set(['text', 'number', 'select', 'boolean', 'date']);

export const normalizeFormDefinitions = (value) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item) => {
    const formName = String(item?.formName || item?.name || '').trim().slice(0, 120);
    const fields = Array.isArray(item?.fields) ? item.fields.slice(0, 20).map((field, index) => {
      const id = String(field?.id || `field_${index + 1}`).trim().slice(0, 80);
      const label = String(field?.label || '').trim().slice(0, 120);
      const type = FIELD_TYPES.has(String(field?.type)) ? String(field.type) : 'text';
      const options = Array.isArray(field?.options) ? [...new Set(field.options.map((option) => String(option).trim().slice(0, 80)).filter(Boolean))].slice(0, 12) : [];
      const showWhen = field?.showWhen && typeof field.showWhen === 'object' && !Array.isArray(field.showWhen)
        ? { fieldId: String(field.showWhen.fieldId || '').trim().slice(0, 80), equals: String(field.showWhen.equals ?? '').slice(0, 120) }
        : null;
      if (id.length < 1 || label.length < 2) return null;
      return { id, label, type, required: Boolean(field.required), ...(options.length ? { options } : {}), ...(showWhen?.fieldId ? { showWhen } : {}) };
    }).filter(Boolean) : [];
    return formName.length >= 2 ? { formName, fields } : null;
  }).filter(Boolean);
};

export const formDefinitionsFromNames = (value) => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').map((item) => ({ formName: String(item.formName || item.name || '').trim(), fields: item.fields })) : [];

export const formRequirementsFor = (value) => {
  const definitions = normalizeFormDefinitions(formDefinitionsFromNames(value));
  const names = [...new Set((Array.isArray(value) ? value : []).map((item) => String(typeof item === 'string' ? item : item?.formName || item?.name || '').trim().slice(0, 120)).filter((name) => name.length >= 2))].slice(0, 12);
  return names.map((formName, index) => ({ id: `REQFORM-${Date.now()}-${index}`, formName, required: true, completed: false, ...(definitions.find((item) => item.formName.toLowerCase() === formName.toLowerCase()) || {}) }));
};

export const validateFormAnswers = (requirement, input) => {
  const answers = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const fields = Array.isArray(requirement?.fields) ? requirement.fields : [];
  const visible = fields.filter((field) => !field.showWhen || String(answers[field.showWhen.fieldId] ?? '') === String(field.showWhen.equals ?? ''));
  const normalized = {};
  for (const field of visible) {
    const value = answers[field.id];
    if (field.required && (value === undefined || value === null || String(value).trim() === '')) return { error: 'required_form_field_missing', fieldId: field.id };
    if (value === undefined || value === null || String(value).trim() === '') continue;
    if (field.type === 'number' && (!Number.isFinite(Number(value)) || String(value).length > 40)) return { error: 'invalid_form_field', fieldId: field.id };
    if (field.type === 'boolean' && !['true', 'false'].includes(String(value))) return { error: 'invalid_form_field', fieldId: field.id };
    if (field.type === 'select' && (!field.options || !field.options.includes(String(value)))) return { error: 'invalid_form_field', fieldId: field.id };
    normalized[field.id] = field.type === 'number' ? Number(value) : String(value).slice(0, 500);
  }
  const unknown = Object.keys(answers).some((key) => !fields.some((field) => field.id === key));
  if (unknown) return { error: 'unknown_form_field' };
  return { answers: normalized };
};
