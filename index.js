// Suits and ranks
const suits = ["S", "H", "C", "D"];
const ranks = [
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "jack",
  "queen",
  "king",
  "ace",
];

const playerScores = {
  bottom: 0,
  left: 0,
  top: 0,
  right: 0,
};
const playerOrder = ["bottom", "left", "top", "right"];
let playerBids = {
  bottom: 0,
  left: 0,
  top: 0,
  right: 0,
};

let playerTricks = {
  bottom: 0,
  left: 0,
  top: 0,
  right: 0,
};

let teamScores = {
  vertical: 0,
  horizontal: 0,
};

let teamBags = {
  vertical: 0,
  horizontal: 0,
};

let scoreGoal = 250;
let startingPlayer = null;
let awaitingAssignments = false;
let currentAssignmentIndex = 0;
let assignmentHistory = []; // Stack to track card assignments
let trickPlays = []; // stores {card, player, suit, value}
let glowTimeout = null;

let biddingPlayerIndex = 0;
let scoreLimit = 500;

const modal = document.getElementById("gameModal");
const startingPlayerSelect = document.getElementById("startingPlayerSelect");
const scoreLimitInput = document.getElementById("scoreLimitInput");
const biddingPhase = document.getElementById("biddingPhase");
const bidPrompt = document.getElementById("bidPrompt");
const bidInput = document.getElementById("bidInput");

document.getElementById("startBiddingBtn").addEventListener("click", () => {
  startingPlayer = startingPlayerSelect.value;
  scoreLimit = parseInt(scoreLimitInput.value);
  biddingPlayerIndex = 0;
  biddingPhase.classList.remove("hidden");
  bidInput.value = "";
  updateBidPrompt();
});

document.getElementById("submitBidBtn").addEventListener("click", () => {
  const bid = parseInt(bidInput.value);
  const currentPlayer = getPlayerForIndex(biddingPlayerIndex);
  playerBids[currentPlayer] = bid;
  biddingPlayerIndex++;

  if (biddingPlayerIndex < 4) {
    bidInput.value = "";
    updateBidPrompt();
  } else {
    modal.classList.add("hidden");
    awaitingAssignments = true;
    currentAssignmentIndex = 0;
    updatePlayerLabels();
  }
});

function updateBidPrompt() {
  const currentPlayer = getPlayerForIndex(biddingPlayerIndex);
  bidPrompt.textContent = `Enter bid for ${capitalize(currentPlayer)}:`;
}

// Generate card grid
const cardGrid = document.querySelector(".card-grid");
const selectedCards = new Set(); // Track highlighted cards

suits.forEach((suit) => {
  ranks.forEach((rank) => {
    const card = document.createElement("img");
    card.src = `images/${rank}${suit}.png`;
    card.alt = `${rank} of ${suit}`;
    card.classList.add("card");
    card.dataset.played = "false";

    // Highlight on mouseover if mouse button is held
    card.addEventListener("mousedown", () => {
      selectedCards.add(card);
      card.classList.add("highlight");
      console.log(card);
    });
    card.addEventListener("mouseenter", (e) => {
      if (e.buttons === 1) {
        selectedCards.add(card);
        card.classList.add("highlight");
      }
    });

    // Toggle individual card on click
    card.addEventListener("click", () => {
      // Ignore click if no round started
      if (!awaitingAssignments) return;

      const currentPlayer = getPlayerForIndex(currentAssignmentIndex);
      assignCardToPlayer(card, currentPlayer);
    });

    cardGrid.appendChild(card);
  });
});

document.querySelectorAll(".start-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    startingPlayer = btn.dataset.player;
    awaitingAssignments = true;
    currentAssignmentIndex = 0;

    // Clear prior card assignments
    document.querySelectorAll(".card").forEach((card) => {
      card.classList.remove(
        "assigned-bottom",
        "assigned-left",
        "assigned-top",
        "assigned-right"
      );
    });

    // Clear player UI cards
    document
      .querySelectorAll(".player-cards")
      .forEach((div) => (div.innerHTML = ""));
  });
});

// Add global event listeners
document.addEventListener("mouseup", () => {
  selectedCards.forEach((card) => card.classList.remove("highlight"));
  selectedCards.clear();
}); // Clear selection after drag
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    selectedCards.forEach((card) => {
      toggleCard(card);
      card.classList.remove("highlight");
    });
    selectedCards.clear();
  }
});

// Reset button functionality
const resetButton = document.getElementById("resetButton");

document.getElementById("resetButton").addEventListener("click", () => {
  // Reset game state
  teamScores = { vertical: 0, horizontal: 0 };
  teamBags = { vertical: 0, horizontal: 0 };
  playerTricks = { bottom: 0, left: 0, top: 0, right: 0 };
  playerBids = { bottom: 0, left: 0, top: 0, right: 0 };
  updateScoreBox();
  updatePlayerLabels();

  // Reset cards
  document.querySelectorAll(".card").forEach((card) => {
    card.dataset.played = "false";
    card.classList.remove("played", ...playerOrder.map((p) => `assigned-${p}`));
  });

  // Clear mini cards and glow
  document
    .querySelectorAll(".player-cards")
    .forEach((div) => (div.innerHTML = ""));
  document
    .querySelectorAll(".player-name")
    .forEach((el) => el.classList.remove("glow"));

  // Show modal
  modal.classList.remove("hidden");
  biddingPhase.classList.add("hidden");
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// undo function
document.getElementById("undo-button").addEventListener("click", () => {
  const last = assignmentHistory.pop();
  if (!last) return;

  // Unmark card
  last.card.classList.remove(`assigned-${last.player}`);
  last.card.dataset.played = "false";

  // Remove last mini card from player display
  const playerDiv = document.querySelector(`.player-cards.${last.player}`);
  playerDiv.removeChild(playerDiv.lastChild);

  // Adjust round assignment tracking if in progress
  if (awaitingAssignments && currentAssignmentIndex > 0) {
    currentAssignmentIndex--;
  }
});

// Helper function to toggle a card's state
function toggleCard(card) {
  const isPlayed = card.classList.toggle("played");
  card.dataset.played = isPlayed ? "true" : "false";
}

function getPlayerForIndex(index) {
  const startIdx = playerOrder.indexOf(startingPlayer);
  const playerIdx = (startIdx + index) % 4;
  return playerOrder[playerIdx];
}

function assignCardToPlayer(card, player) {
  // Prevent re-assignment or duplicate plays
  if (card.dataset.played === "true") return;

  // Visually mark
  card.classList.add(`assigned-${player}`, "played");
  card.dataset.played = "true";

  // Add mini card
  const mini = card.cloneNode();
  mini.classList.remove("card");
  document.querySelector(`.player-cards.${player}`).appendChild(mini);

  // Track assignment
  assignmentHistory.push({ card, player, mini });

  // Determine suit/value
  const cardName = card.src.split("/").pop().split(".")[0]; // e.g., "aceS"
  const suit = cardName.slice(-1);
  const value = getCardValue(cardName.slice(0, -1).toLowerCase());
  trickPlays.push({ card, player, suit, value });

  currentAssignmentIndex++;
  if (currentAssignmentIndex === 4) {
    resolveTrickWinner();
  }
}

function resolveTrickWinner() {
  const leadSuit = trickPlays[0].suit;
  let winner = null;

  // First check if any spades were played
  const spadePlays = trickPlays.filter((play) => play.suit === "S");

  if (spadePlays.length > 0) {
    // Winner is the highest spade
    winner = spadePlays.reduce((best, play) =>
      play.value > best.value ? play : best
    );
  } else {
    // No spades played: get highest card in the lead suit
    const leadSuitPlays = trickPlays.filter((play) => play.suit === leadSuit);
    console.log("leadCheck:" + leadSuitPlays);
    winner = leadSuitPlays.reduce((best, play) =>
      play.value > best.value ? play : best
    );
  }

  highlightWinner(winner.player);
  playerScores[winner.player]++;
  playerTricks[winner.player]++;
  updateScoreDisplay(winner.player);

  if (document.querySelectorAll(".card.played").length === 52) {
    applyTeamScoring();
  }

  setNextTrick(winner.player);
  updatePlayerLabels();
}

function applyTeamScoring() {
  let vTricks = playerTricks.top + playerTricks.bottom;
  let hTricks = playerTricks.left + playerTricks.right;

  let vBid = playerBids.top + playerBids.bottom;
  let hBid = playerBids.left + playerBids.right;

  let vScore = 0;
  let hScore = 0;

  // VERTICAL scoring
  if (playerBids.top === 0 && playerTricks.top === 0) vScore += 100;
  else if (playerBids.top === 0 && playerTricks.top > 0) vScore -= 100;

  if (playerBids.bottom === 0 && playerTricks.bottom === 0) vScore += 100;
  else if (playerBids.bottom === 0 && playerTricks.bottom > 0) vScore -= 100;

  if (vTricks >= vBid) {
    vScore += vBid * 10;
    const bags = vTricks - vBid;
    teamBags.vertical += bags;
    vScore += bags;
  } else {
    vScore -= vBid * 10;
  }

  if (teamBags.vertical >= 10) {
    vScore -= 100;
    teamBags.vertical = 0;
  }

  // HORIZONTAL scoring
  if (playerBids.left === 0 && playerTricks.left === 0) hScore += 100;
  else if (playerBids.left === 0 && playerTricks.left > 0) hScore -= 100;

  if (playerBids.right === 0 && playerTricks.right === 0) hScore += 100;
  else if (playerBids.right === 0 && playerTricks.right > 0) hScore -= 100;

  if (hTricks >= hBid) {
    hScore += hBid * 10;
    const bags = hTricks - hBid;
    teamBags.horizontal += bags;
    hScore += bags;
  } else {
    hScore -= hBid * 10;
  }

  if (teamBags.horizontal >= 10) {
    hScore -= 100;
    teamBags.horizontal = 0;
  }

  teamScores.vertical += vScore;
  teamScores.horizontal += hScore;

  updateScoreBox();
  resetForNextRound();
}

function updateScoreBox() {
  document.querySelector(".team-score.vertical .score").textContent =
    teamScores.vertical;
  document.querySelector(".team-score.horizontal .score").textContent =
    teamScores.horizontal;
  document.querySelector(".team-score.vertical .bags").textContent =
    teamBags.vertical;
  document.querySelector(".team-score.horizontal .bags").textContent =
    teamBags.horizontal;
}

function highlightWinner(player) {
  document
    .querySelectorAll(".player-name")
    .forEach((el) => el.classList.remove("glow"));
  document.querySelector(`.player-name.${player}`).classList.add("glow");
}

function updatePlayerLabels() {
  for (let player of playerOrder) {
    const el = document.querySelector(`.player-name.${player}`);
    el.textContent = `${capitalize(player)} - ${playerTricks[player]}/${playerBids[player]}`;
  }
}

function updateScoreDisplay(player) {
  const scoreSpan = document.querySelector(`.score[data-player="${player}"]`);
  if (scoreSpan) {
    scoreSpan.textContent = playerScores[player];
  }
}

function setNextTrick(winnerPlayer) {
  startingPlayer = winnerPlayer;
  awaitingAssignments = true;
  currentAssignmentIndex = 0;
  trickPlays = [];

  // Remove glow after ~4 seconds to allow new round
  if (glowTimeout) clearTimeout(glowTimeout);
  glowTimeout = setTimeout(() => {
    document
      .querySelectorAll(".player-name")
      .forEach((el) => el.classList.remove("glow"));
  }, 4000);
}

function getCardValue(rank) {
  if (!isNaN(rank)) return parseInt(rank);
  return (
    {
      jack: 11,
      queen: 12,
      king: 13,
      ace: 14,
    }[rank] || 0
  );
}
