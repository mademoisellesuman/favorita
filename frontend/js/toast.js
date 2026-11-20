// A small message that appears at the bottom of the screen for a few seconds.
const element = document.getElementById('toast');
let timer;

export function showToast(message) {
  element.textContent = message;   // textContent, never innerHTML: messages are plain text
  element.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { element.hidden = true; }, 3500);
}