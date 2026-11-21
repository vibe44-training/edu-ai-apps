const form = document.getElementById('quiz-form');
const submitButton = document.getElementById('submit-button');
const result = document.getElementById('result');

const CHOICE_MARKS = ['①', '②', '③', '④'];
const SUBMIT_LABEL = submitButton.textContent;

const fields = [
  { name: 'subject', message: '교과를 선택해 주세요.', isValid: (value) => value !== '' },
  { name: 'unit', message: '단원을 2자 이상 입력해 주세요.', isValid: (value) => value.length >= 2 },
  { name: 'difficulty', message: '난이도를 선택해 주세요.', isValid: (value) => value !== '' }
];

function readValues() {
  const unitInput = form.elements.unit;
  unitInput.value = unitInput.value.trim();
  return {
    subject: form.elements.subject.value,
    unit: unitInput.value,
    difficulty: form.elements.difficulty.value
  };
}

function validate(values) {
  let firstInvalid = null;
  for (const field of fields) {
    const input = form.elements[field.name];
    const valid = field.isValid(values[field.name]);
    document.getElementById(`${field.name}-error`).textContent = valid ? '' : field.message;
    input.setAttribute('aria-invalid', String(!valid));
    if (!valid && !firstInvalid) {
      firstInvalid = input;
    }
  }
  if (firstInvalid) {
    firstInvalid.focus();
  }
  return !firstInvalid;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? '문항 만드는 중…' : SUBMIT_LABEL;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function showMessage(text, isError) {
  result.replaceChildren(element('p', isError ? 'result-error' : '', text));
}

async function requestQuiz(values) {
  let response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'quiz', ...values })
    });
  } catch {
    throw new Error('서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해 주세요.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data && data.error) || `요청 실패: ${response.status}`);
  }
  if (!Array.isArray(data)) {
    throw new Error('문항을 불러오지 못했습니다. 다시 시도해 주세요.');
  }
  return data;
}

function createCard(item, index) {
  const card = element('article', 'card');
  card.append(
    element('h3', 'card-number', `문항 ${index + 1}`),
    element('p', 'card-question', item.question)
  );

  const choices = element('ol', 'card-choices');
  item.choices.forEach((choice, choiceIndex) => {
    choices.append(element('li', '', `${CHOICE_MARKS[choiceIndex]} ${choice}`));
  });

  const answer = element('details', 'card-answer');
  answer.append(
    element('summary', '', '정답·해설 보기'),
    element('p', '', `정답: ${CHOICE_MARKS[item.answer - 1]} ${item.choices[item.answer - 1]}`),
    element('p', '', `해설: ${item.explanation}`)
  );

  card.append(choices, answer);
  return card;
}

function renderCards(items, values) {
  const cards = element('div', 'cards');
  items.forEach((item, index) => cards.append(createCard(item, index)));
  result.replaceChildren(
    element('h2', '', `${values.subject} · ${values.unit} · ${values.difficulty}`),
    element('p', 'result-note', 'AI가 만든 문항입니다. 수업에 쓰기 전에 정답과 표현을 확인해 주세요.'),
    cards
  );
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = readValues();
  if (!validate(values)) {
    return;
  }

  setLoading(true);
  showMessage('문항을 만들고 있습니다. 잠시만 기다려 주세요…');
  try {
    renderCards(await requestQuiz(values), values);
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setLoading(false);
  }
});
