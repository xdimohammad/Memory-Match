const $ = (id) => document.getElementById(id);

const gameBoard = $("gameBoard");
const themeSelect = $("themeSelect");
const levelSelect = $("levelSelect");
const starCount = $("starCount");
const moveCount = $("moveCount");
const timerDisplay = $("timer");
const gameMessage = $("gameMessage");
const soundButton = $("soundButton");
const restartButton = $("restartButton");
const winModal = $("winModal");
const playAgainButton = $("playAgainButton");

const ASSET_BASE = "https://raw.githubusercontent.com/xdimohammad/Memory-Match/main";

const themes = {
  toys: [
    { name: "Teddy Bear", image: `${ASSET_BASE}/Toys-Playtime/teddy-bear.png` },
    { name: "Ball", image: `${ASSET_BASE}/Toys-Playtime/ball.png` },
    { name: "Toy Car", image: `${ASSET_BASE}/Toys-Playtime/toy-car.png` },
    { name: "Blocks", image: `${ASSET_BASE}/Toys-Playtime/building-blocks.png` },
    { name: "Doll", image: `${ASSET_BASE}/Toys-Playtime/doll.png` }
  ],
  everyday: [
    { name: "Toothbrush", image: `${ASSET_BASE}/Everyday-Things/toothbrush.png` },
    { name: "Cup", image: `${ASSET_BASE}/Everyday-Things/cup.png` },
    { name: "Soap", image: `${ASSET_BASE}/Everyday-Things/soap.png` },
    { name: "Towel", image: `${ASSET_BASE}/Everyday-Things/towel.png` },
    { name: "Spoon", image: `${ASSET_BASE}/Everyday-Things/spoon.png` }
  ],
  home: [
    { name: "Bed", image: `${ASSET_BASE}/Things-at-Home/bed.png` },
    { name: "Pillow", image: `${ASSET_BASE}/Things-at-Home/pillow.png` },
    { name: "Lamp", image: `${ASSET_BASE}/Things-at-Home/lamp.png` },
    { name: "Chair", image: `${ASSET_BASE}/Things-at-Home/chair.png` },
    { name: "Clock", image: `${ASSET_BASE}/Things-at-Home/clock.png` }
  ],
  school: [
    { name: "School Bag", image: `${ASSET_BASE}/School-Things/school-bag.png` },
    { name: "Pencil", image: `${ASSET_BASE}/School-Things/pencil.png` },
    { name: "Book", image: `${ASSET_BASE}/School-Things/book.png` },
    { name: "Crayons", image: `${ASSET_BASE}/School-Things/crayons.png` },
    { name: "Ruler", image: `${ASSET_BASE}/School-Things/ruler.png` }
  ],
  clothes: [
    { name: "Shirt", image: `${ASSET_BASE}/Clothes-Accessories/shirt.png` },
    { name: "Hat", image: `${ASSET_BASE}/Clothes-Accessories/hat.png` },
    { name: "Socks", image: `${ASSET_BASE}/Clothes-Accessories/socks.png` },
    { name: "Shoes", image: `${ASSET_BASE}/Clothes-Accessories/shoes.png` },
    { name: "Umbrella", image: `${ASSET_BASE}/Clothes-Accessories/umbrella.png` }
  ]
};

const levelPairs = { easy: 4, medium: 6, hard: 8 };

let cards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;
let moves = 0;
let stars = 0;
let elapsedSeconds = 0;
let timerInterval = null;
let gameStarted = false;
let soundEnabled = true;
let audioContext = null;

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getSelectedObjects() {
  const selectedTheme = themeSelect.value;
  const objects = selectedTheme === "all"
    ? Object.values(themes).flat()
    : themes[selectedTheme] || [];
  const requestedPairs = levelPairs[levelSelect.value] || 6;
  return shuffle(objects).slice(0, Math.min(requestedPairs, objects.length));
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return String(minutes).padStart(2, "0") + ":" + String(remainingSeconds).padStart(2, "0");
}

function updateStats() {
  starCount.textContent = stars;
  moveCount.textContent = moves;
  timerDisplay.textContent = formatTime(elapsedSeconds);
}

function startTimer() {
  if (gameStarted) return;
  gameStarted = true;
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    timerDisplay.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(frequency, duration = 0.12, type = "sine") {
  if (!soundEnabled) return;
  const context = createAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function playMatchSound() {
  playTone(523, 0.15);
  setTimeout(() => playTone(659, 0.18), 100);
}

function playWinSound() {
  [523, 659, 784, 1046].forEach((frequency, index) => {
    setTimeout(() => playTone(frequency, 0.25), index * 140);
  });
}

function speakWord(word) {
  if (!soundEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(word);
  speech.lang = "en-US";
  speech.rate = 0.82;
  speech.pitch = 1.05;
  speech.volume = 1;
  window.speechSynthesis.speak(speech);
}

function createCard(object, index) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "memory-card";
  card.dataset.name = object.name;
  card.dataset.index = index;
  card.setAttribute("aria-label", "Hidden memory card");

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back">
        <span>✦</span>
        <small>ELARA</small>
      </div>
      <div class="card-face card-front">
        <img class="card-emoji" src="${object.image}" alt="${object.name}" draggable="false">
        <span class="card-word">${object.name}</span>
      </div>
    </div>
  `;

  const image = card.querySelector("img");
  image.addEventListener("error", () => {
    image.alt = `${object.name} image unavailable`;
    image.style.visibility = "hidden";
    console.error("Could not load image:", object.image);
  });

  card.addEventListener("click", () => flipCard(card, object));
  return card;
}

function buildBoard() {
  gameBoard.innerHTML = "";
  const objects = getSelectedObjects();
  const pairedObjects = shuffle([...objects, ...objects]);
  cards = [];

  pairedObjects.forEach((object, index) => {
    const card = createCard(object, index);
    cards.push(card);
    gameBoard.appendChild(card);
  });

  gameBoard.dataset.pairs = objects.length;
}

function flipCard(card, object) {
  if (lockBoard || card === firstCard || card.classList.contains("flipped") || card.classList.contains("matched")) return;
  startTimer();
  card.classList.add("flipped");
  card.setAttribute("aria-label", object.name);
  playTone(420, 0.08);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  moves++;
  updateStats();
  checkMatch();
}

function checkMatch() {
  if (firstCard.dataset.name === secondCard.dataset.name) handleMatch();
  else handleMismatch();
}

function handleMatch() {
  firstCard.classList.add("matched");
  secondCard.classList.add("matched");
  firstCard.disabled = true;
  secondCard.disabled = true;
  matchedPairs++;
  stars++;
  updateStats();

  gameMessage.textContent = `Wonderful! ${firstCard.dataset.name}!`;
  playMatchSound();
  speakWord(firstCard.dataset.name);
  resetTurn();

  if (matchedPairs === Number(gameBoard.dataset.pairs)) setTimeout(finishGame, 800);
}

function handleMismatch() {
  lockBoard = true;
  gameMessage.textContent = "Almost! Try another pair 💕";

  setTimeout(() => {
    firstCard.classList.remove("flipped");
    secondCard.classList.remove("flipped");
    firstCard.setAttribute("aria-label", "Hidden memory card");
    secondCard.setAttribute("aria-label", "Hidden memory card");
    resetTurn();
    gameMessage.textContent = "Keep looking for matching pairs!";
  }, 850);
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function finishGame() {
  stopTimer();
  const totalPairs = Number(gameBoard.dataset.pairs);
  let rating = 1;
  if (moves <= totalPairs + 2) rating = 3;
  else if (moves <= totalPairs * 2) rating = 2;

  $("winStars").textContent = "⭐".repeat(rating);
  $("finalMoves").textContent = moves;
  $("finalTime").textContent = formatTime(elapsedSeconds);
  $("winTitle").textContent = "Amazing Job!";
  winModal.classList.remove("hidden");
  gameMessage.textContent = "You did it! All pairs matched!";
  playWinSound();
  speakWord("Amazing job!");
}

function startNewGame() {
  stopTimer();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;
  moves = 0;
  stars = 0;
  elapsedSeconds = 0;
  gameStarted = false;

  winModal.classList.add("hidden");
  gameMessage.textContent = "Find the matching pairs!";
  updateStats();
  buildBoard();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? "🔊" : "🔇";
  soundButton.title = soundEnabled ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-label", soundEnabled ? "Turn sound off" : "Turn sound on");
  if (!soundEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

themeSelect.addEventListener("change", startNewGame);
levelSelect.addEventListener("change", startNewGame);
restartButton.addEventListener("click", startNewGame);
playAgainButton.addEventListener("click", startNewGame);
soundButton.addEventListener("click", toggleSound);

startNewGame();
