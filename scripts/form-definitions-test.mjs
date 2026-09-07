import assert from 'node:assert/strict';
import { formRequirementsFor, normalizeFormDefinitions, validateFormAnswers } from '../form-definitions.mjs';

const definitions = normalizeFormDefinitions([{ formName: 'Electrical safety', fields: [
  { id: 'condition', label: 'Condition', type: 'select', required: true, options: ['Safe', 'Unsafe'] },
  { id: 'hazard', label: 'Hazard note', type: 'text', required: true, showWhen: { fieldId: 'condition', equals: 'Unsafe' } },
  { id: 'isolated', label: 'Isolated', type: 'boolean', required: true }
] }]);
assert.equal(definitions[0].fields.length, 3);
const requirements = formRequirementsFor([{ formName: 'Electrical safety', fields: definitions[0].fields }]);
assert.equal(requirements[0].fields[0].id, 'condition');
assert.deepEqual(validateFormAnswers(requirements[0], { condition: 'Safe', isolated: 'true' }).answers, { condition: 'Safe', isolated: 'true' });
assert.equal(validateFormAnswers(requirements[0], { condition: 'Unsafe', isolated: 'true' }).error, 'required_form_field_missing');
assert.equal(validateFormAnswers(requirements[0], { condition: 'Safe', isolated: 'true', extra: 'nope' }).error, 'unknown_form_field');
console.log('Northstar structured form definition checks passed');
