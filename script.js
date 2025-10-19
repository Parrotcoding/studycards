const views = {
  intro: document.getElementById('introView'),
  builder: document.getElementById('builderView'),
  upload: document.getElementById('uploadView'),
  mode: document.getElementById('modeView'),
  study: document.getElementById('studyView')
};

const buttons = {
  createSetOption: document.getElementById('createSetOption'),
  uploadSetOption: document.getElementById('uploadSetOption'),
  builderBack: document.getElementById('builderBack'),
  builderReady: document.getElementById('builderReady'),
  uploadBack: document.getElementById('uploadBack'),
  uploadReady: document.getElementById('uploadReady'),
  classicMode: document.getElementById('classicMode'),
  learnMode: document.getElementById('learnMode'),
  modeBack: document.getElementById('modeBack'),
  studyBack: document.getElementById('studyBack'),
  downloadSet: document.getElementById('downloadSetBtn'),
  downloadCancel: document.getElementById('downloadCancel'),
  downloadConfirm: document.getElementById('downloadConfirm')
};

const elements = {
  cardList: document.getElementById('cardList'),
  cardForm: document.getElementById('cardForm'),
  termInput: document.getElementById('termInput'),
  definitionInput: document.getElementById('definitionInput'),
  fileInput: document.getElementById('fileInput'),
  studyContent: document.getElementById('studyContent'),
  studyStatus: document.getElementById('studyStatus'),
  downloadOverlay: document.getElementById('downloadOverlay'),
  downloadName: document.getElementById('downloadName')
};

let cards = [];
let currentView = 'intro';
let lastEntryPoint = 'intro';
let studySession = null;

function showView(name) {
  Object.entries(views).forEach(([key, node]) => {
    node.classList.toggle('hidden', key !== name);
  });
  currentView = name;
}

function setCards(newCards) {
  cards = newCards.map((card, idx) => ({ ...card, id: idx + 1 }));
  updateCardList();
  const hasCards = cards.length > 0;
  buttons.builderReady.disabled = !hasCards;
  buttons.uploadReady.disabled = !hasCards;
  buttons.downloadSet.disabled = !hasCards;
}

function updateCardList() {
  if (currentView !== 'builder') return;
  elements.cardList.innerHTML = '';
  if (cards.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No cards yet. Add your first term to get started!';
    empty.className = 'card__subtitle';
    elements.cardList.appendChild(empty);
    return;
  }

  cards.forEach((card, index) => {
    const item = document.createElement('div');
    item.className = 'card-list__item';

    const term = document.createElement('span');
    term.className = 'card-list__term';
    term.textContent = card.term;

    const definition = document.createElement('span');
    definition.className = 'card-list__definition';
    definition.textContent = card.definition;

    const remove = document.createElement('button');
    remove.className = 'card-list__remove';
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      cards.splice(index, 1);
      setCards(cards);
      updateCardList();
    });

    item.append(term, definition, remove);
    elements.cardList.appendChild(item);
  });
}

function parseCSV(text) {
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  if (rows.length === 0) return [];

  const parsed = [];
  rows.forEach((row, idx) => {
    const parts = row.split(',');
    if (parts.length < 2) return;
    const term = parts[0].trim();
    const definition = parts.slice(1).join(',').trim();
    if (!term || !definition) return;
    // Skip header row if it looks like one
    if (idx === 0 && /term/i.test(term) && /definition/i.test(definition)) {
      return;
    }
    parsed.push({ term, definition });
  });
  return parsed;
}

function enterBuilder() {
  lastEntryPoint = 'builder';
  showView('builder');
  updateCardList();
}

function enterUpload() {
  lastEntryPoint = 'upload';
  showView('upload');
}

function resetStudy() {
  studySession = null;
  elements.studyContent.innerHTML = '';
  elements.studyStatus.textContent = '';
}

function goToModeSelection() {
  resetStudy();
  showView('mode');
}

function ensureCardsAvailable() {
  if (!cards.length) {
    alert('Add or import some cards first!');
    return false;
  }
  return true;
}

function startClassicMode() {
  if (!ensureCardsAvailable()) return;
  studySession = createClassicSession(cards);
  showView('study');
  renderClassicSession();
}

function startLearnMode() {
  if (!ensureCardsAvailable()) return;
  studySession = createLearnSession(cards);
  showView('study');
  renderLearnSession();
}

function createClassicSession(cards) {
  return {
    type: 'classic',
    queue: [...cards],
    reviewQueue: [],
    current: null,
    known: [],
    round: 1,
    showAnswer: false
  };
}

function renderClassicSession() {
  const session = studySession;
  if (!session) return;

  if (!session.current && session.queue.length === 0) {
    if (session.reviewQueue.length > 0) {
      session.queue = session.reviewQueue;
      session.reviewQueue = [];
      session.round += 1;
    } else {
      renderStudyComplete('Know & Review');
      return;
    }
  }

  if (!session.current) {
    session.current = session.queue.shift();
    session.showAnswer = false;
  }

  elements.studyStatus.textContent = `Round ${session.round} • Known ${session.known.length}/${cards.length}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'study-card';

  const prompt = document.createElement('div');
  prompt.className = 'study-card__prompt';
  prompt.textContent = session.current.term;
  wrapper.appendChild(prompt);

  if (session.showAnswer) {
    const answer = document.createElement('div');
    answer.className = 'study-card__answer';
    answer.textContent = session.current.definition;
    wrapper.appendChild(answer);

    const actions = document.createElement('div');
    actions.className = 'study-actions';

    const knewIt = document.createElement('button');
    knewIt.className = 'button';
    knewIt.textContent = 'I knew it';
    knewIt.addEventListener('click', () => {
      session.known.push(session.current);
      session.current = null;
      renderClassicSession();
    });

    const needReview = document.createElement('button');
    needReview.className = 'button button--secondary';
    needReview.textContent = 'Need review';
    needReview.addEventListener('click', () => {
      session.reviewQueue.push(session.current);
      session.current = null;
      renderClassicSession();
    });

    actions.append(knewIt, needReview);
    wrapper.appendChild(actions);
  } else {
    const actions = document.createElement('div');
    actions.className = 'study-actions';
    const reveal = document.createElement('button');
    reveal.className = 'button';
    reveal.textContent = 'Show answer';
    reveal.addEventListener('click', () => {
      session.showAnswer = true;
      renderClassicSession();
    });
    actions.appendChild(reveal);
    wrapper.appendChild(actions);
  }

  elements.studyContent.innerHTML = '';
  elements.studyContent.appendChild(wrapper);
}

function renderStudyComplete(modeName) {
  elements.studyStatus.textContent = `${modeName} complete!`;
  const wrapper = document.createElement('div');
  wrapper.className = 'study-card';
  const heading = document.createElement('div');
  heading.className = 'study-card__prompt';
  heading.textContent = 'Great job! 🎉';
  const message = document.createElement('div');
  message.className = 'study-card__answer';
  message.textContent = 'You have mastered every card in this set.';
  const actions = document.createElement('div');
  actions.className = 'study-actions';
  const modesButton = document.createElement('button');
  modesButton.className = 'button';
  modesButton.textContent = 'Choose another mode';
  modesButton.addEventListener('click', () => {
    goToModeSelection();
  });
  actions.appendChild(modesButton);

  wrapper.append(heading, message, actions);
  elements.studyContent.innerHTML = '';
  elements.studyContent.appendChild(wrapper);
}

// Learn mode utilities
function createLearnSession(cards) {
  return {
    type: 'learn',
    stage: 'multipleChoice',
    mcQueue: shuffle(cards.map((card) => ({
      card,
      mcCorrect: 0
    }))),
    textData: cards.map((card) => ({
      card,
      textStreak: 0,
      nextDue: 0
    })),
    step: 0,
    masteredCount: 0
  };
}

function renderLearnSession() {
  const session = studySession;
  if (!session) return;

  if (session.stage === 'multipleChoice') {
    renderMultipleChoice(session);
  } else {
    renderTextInput(session);
  }
}

function renderMultipleChoice(session) {
  if (session.mcQueue.length === 0) {
    session.stage = 'text';
    session.step = 0;
    renderLearnSession();
    return;
  }

  const current = session.mcQueue[0];
  elements.studyStatus.textContent = `Learn it all • Multiple choice (${cards.length - session.mcQueue.length + 1}/${cards.length})`;

  const wrapper = document.createElement('div');
  wrapper.className = 'study-card';

  const prompt = document.createElement('div');
  prompt.className = 'study-card__prompt';
  prompt.textContent = `What is: ${current.card.term}?`;

  const choices = buildChoices(current.card, cards);

  const optionsList = document.createElement('div');
  optionsList.className = 'study-actions';

  choices.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'button';
    button.textContent = choice.definition;
    button.addEventListener('click', () => {
      const correct = choice.definition === current.card.definition;
      if (correct) {
        current.mcCorrect += 1;
        session.mcQueue.shift();
        if (current.mcCorrect < 2) {
          session.mcQueue.push(current);
        }
      } else {
        current.mcCorrect = 0;
        shuffleInPlace(session.mcQueue);
      }
      renderLearnSession();
    });
    optionsList.appendChild(button);
  });

  const hint = document.createElement('div');
  hint.className = 'study-card__answer';
  hint.textContent = 'Answer correctly twice to unlock text practice.';

  wrapper.append(prompt, optionsList, hint);
  elements.studyContent.innerHTML = '';
  elements.studyContent.appendChild(wrapper);
}

function buildChoices(correctCard, allCards) {
  const options = [correctCard];
  const others = allCards.filter((card) => card !== correctCard);
  shuffleInPlace(others);
  while (options.length < Math.min(4, allCards.length) && others.length > 0) {
    options.push(others.pop());
  }
  return shuffle(options.map((card) => ({ definition: card.definition })));
}

function renderTextInput(session) {
  const dueCards = session.textData.filter((item) => item.nextDue <= session.step);
  if (dueCards.length === 0) {
    const nextDue = Math.min(...session.textData.map((item) => item.nextDue));
    session.step = nextDue;
  }

  const available = session.textData.filter((item) => item.nextDue <= session.step);
  const unfinished = available.filter((item) => item.textStreak < 3);

  if (session.textData.every((item) => item.textStreak >= 3)) {
    renderStudyComplete('Learn it all');
    return;
  }

  const current = (unfinished.length ? unfinished : available)[0];
  session.masteredCount = session.textData.filter((item) => item.textStreak >= 3).length;
  elements.studyStatus.textContent = `Learn it all • Type it out (${session.masteredCount}/${cards.length} mastered)`;

  const wrapper = document.createElement('div');
  wrapper.className = 'study-card';
  const prompt = document.createElement('div');
  prompt.className = 'study-card__prompt';
  prompt.textContent = `Type the definition for: ${current.card.term}`;

  const form = document.createElement('form');
  form.className = 'study-actions';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector('input');
    const feedback = form.querySelector('span');
    const userAnswer = input.value.trim();
    const correct = normalize(current.card.definition) === normalize(userAnswer);

    if (correct) {
      current.textStreak += 1;
      if (current.textStreak >= 3) {
        session.masteredCount = session.textData.filter((item) => item.textStreak >= 3).length;
      }
      current.nextDue = session.step + Math.pow(2, current.textStreak);
      feedback.textContent = 'Correct!';
      feedback.style.color = 'var(--blue-primary)';
    } else {
      current.textStreak = Math.max(0, current.textStreak - 1);
      current.nextDue = session.step + 1;
      feedback.textContent = `Keep trying. Answer: ${current.card.definition}`;
      feedback.style.color = '#c0392b';
    }

    input.value = '';
    session.step += 1;
    setTimeout(() => renderLearnSession(), 750);
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.required = true;
  input.placeholder = 'Write the full answer';
  input.className = 'text-input';

  const submit = document.createElement('button');
  submit.className = 'button';
  submit.type = 'submit';
  submit.textContent = 'Check';

  const feedback = document.createElement('span');
  feedback.className = 'study-card__answer';

  form.append(input, submit, feedback);
  wrapper.append(prompt, form);
  elements.studyContent.innerHTML = '';
  elements.studyContent.appendChild(wrapper);
  input.focus();
}

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function shuffle(array) {
  const copy = [...array];
  shuffleInPlace(copy);
  return copy;
}

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function openDownloadOverlay() {
  elements.downloadOverlay.classList.remove('hidden');
  elements.downloadName.value = '';
  elements.downloadName.focus();
}

function closeDownloadOverlay() {
  elements.downloadOverlay.classList.add('hidden');
}

function downloadCSV() {
  const fileName = (elements.downloadName.value.trim() || 'flashcards') + '.csv';
  const header = 'Term,Definition\n';
  const rows = cards.map((card) => `${escapeCSV(card.term)},${escapeCSV(card.definition)}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  closeDownloadOverlay();
}

function escapeCSV(value) {
  if (/,|"|\n/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Event wiring
buttons.createSetOption.addEventListener('click', () => {
  enterBuilder();
});

buttons.uploadSetOption.addEventListener('click', () => {
  enterUpload();
});

buttons.builderBack.addEventListener('click', () => {
  showView('intro');
});

buttons.uploadBack.addEventListener('click', () => {
  showView('intro');
  elements.fileInput.value = '';
});

buttons.builderReady.addEventListener('click', () => {
  showView('mode');
});

buttons.uploadReady.addEventListener('click', () => {
  showView('mode');
});

buttons.modeBack.addEventListener('click', () => {
  if (lastEntryPoint === 'builder') {
    enterBuilder();
  } else if (lastEntryPoint === 'upload') {
    enterUpload();
  } else {
    showView('intro');
  }
});

buttons.classicMode.addEventListener('click', startClassicMode);
buttons.learnMode.addEventListener('click', startLearnMode);

buttons.studyBack.addEventListener('click', () => {
  goToModeSelection();
});

buttons.downloadSet.addEventListener('click', () => {
  if (cards.length === 0) return;
  openDownloadOverlay();
});

buttons.downloadCancel.addEventListener('click', () => {
  closeDownloadOverlay();
});

buttons.downloadConfirm.addEventListener('click', () => {
  if (!cards.length) {
    alert('No cards to download yet!');
    return;
  }
  downloadCSV();
});

elements.cardForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const term = elements.termInput.value.trim();
  const definition = elements.definitionInput.value.trim();
  if (!term || !definition) return;
  cards.push({ term, definition });
  setCards(cards);
  updateCardList();
  elements.cardForm.reset();
  elements.termInput.focus();
});

elements.fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result;
    if (typeof text === 'string') {
      const parsed = parseCSV(text);
      if (!parsed.length) {
        alert('Could not find any cards in that file. Make sure it has "term,definition" format.');
        return;
      }
      setCards(parsed);
      buttons.uploadReady.disabled = false;
    }
  };
  reader.readAsText(file);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.downloadOverlay.classList.contains('hidden')) {
    closeDownloadOverlay();
  }
});

showView('intro');
