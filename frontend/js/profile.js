import { validate } from './validators.js';
import * as auth from './auth.js';

/* ---------- Elements ---------- */
const authPanel = document.getElementById('authPanel');
const profileLoading = document.getElementById('profileLoading');
const logoutAllBtn = document.getElementById('logoutAllBtn');
const accountPanel = document.getElementById('accountPanel');
const tabs = document.querySelectorAll('.auth__tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const profileForm = document.getElementById('profileForm');
const usernameForm = document.getElementById('usernameForm');
const passwordForm = document.getElementById('passwordForm');
const logoutBtn = document.getElementById('logoutBtn');

const accountName = document.getElementById('accountName');
const accountHandle = document.getElementById('accountHandle');
const accountAvatar = document.getElementById('accountAvatar');

/* ---------- Form feedback helpers ---------- */
const field = (form, name) => form.querySelector(`[name="${name}"]`);

export function clearFeedback(form) {
  form.querySelectorAll('[data-error-for]').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  setMessage(form, '');
}

function showErrors(form, errors) {
  let firstInput = null;
  for (const [name, message] of Object.entries(errors)) {
    const errorEl = form.querySelector(`[data-error-for="${name}"]`);
    const input = field(form, name);
    if (errorEl) errorEl.textContent = message;
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      firstInput ??= input;
    }
  }
  firstInput?.focus(); // jump to the first problem
}

export function setMessage(form, text, type = 'error') {
  const el = form.querySelector('[data-form-message]');
  el.textContent = text;
  el.className = `form__message form__message--${type}`;
}

function setBusy(form, busy) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = busy;
  button.dataset.label ??= button.textContent;
  button.textContent = busy ? 'Please wait…' : button.dataset.label;
}

/* ---------- The shared form routine ---------- */
// form:      the <form> element
// fields:    which validation rules to apply
// action:    the auth function to call if validation passes
// onSuccess: what to do afterwards
export function wireForm(form, fields, action, onSuccess) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // stop the browser from reloading the page
    clearFeedback(form);

    // Read every input as { name: value }. Trim everything except passwords.
    const values = Object.fromEntries(new FormData(form));
    for (const key of Object.keys(values)) {
      if (!key.toLowerCase().includes('password')) values[key] = values[key].trim();
    }

    const errors = validate(values, fields);
    if (Object.keys(errors).length > 0) {
      showErrors(form, errors);
      return;
    }

    setBusy(form, true);
    try {
      const result = await action(values);
      await onSuccess(result);
    } catch (error) {
      // Show the message next to its field if the form has that field, otherwise at the bottom.
      const fieldExists = error.field && form.querySelector(`[data-error-for="${error.field}"]`);
      if (fieldExists) showErrors(form, { [error.field]: error.message });
      else setMessage(form, error.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(form, false); // runs whether we succeeded or failed
    }
  });
}

/* ---------- Showing the right panel ---------- */
// Show the picture if there is one (and it loads), otherwise the first initial.
function setAvatar(element, user) {
  const initial = user.name.charAt(0).toUpperCase();
  element.textContent = initial;
  if (!user.avatar) return;

  const img = document.createElement('img');
  img.alt = '';
  img.addEventListener('error', () => { img.remove(); }); // broken link: keep the initial
  img.src = user.avatar;
  element.textContent = '';
  element.append(img);
  img.addEventListener('error', () => { element.textContent = initial; });
}

function fillAccount(user) {
  accountName.textContent = user.name;
  accountHandle.textContent = `@${user.username}`;
  setAvatar(accountAvatar, user);
  field(profileForm, 'name').value = user.name;
  field(profileForm, 'email').value = user.email;
  field(profileForm, 'bio').value = user.bio;
  field(profileForm, 'avatar').value = user.avatar;
  field(usernameForm, 'username').value = user.username;
}
async function render() {
  let user = null;
  try {
    user = await auth.getCurrentUser();
  } catch (error) {
    // Server unreachable: show the login panel instead of a blank page.
    console.warn('Could not load the account:', error.message);
  }
  profileLoading.hidden = true;
  authPanel.hidden = Boolean(user);
  accountPanel.hidden = !user;
  if (user) fillAccount(user);
  document.dispatchEvent(new CustomEvent('auth:changed'));
}

/* ---------- Tabs: Log in / Register ---------- */
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const showLogin = tab.dataset.tab === 'login';
    tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
    loginForm.hidden = !showLogin;
    registerForm.hidden = showLogin;
    clearFeedback(loginForm);
    clearFeedback(registerForm);
  });
});

/* ---------- Wire up the five forms ---------- */
wireForm(
  loginForm,
  ['loginUsername', 'loginPassword'],
  (v) => auth.login({ username: v.loginUsername, password: v.loginPassword }),
  async () => { loginForm.reset(); await render(); }
);

wireForm(
  registerForm,
  ['name', 'username', 'email', 'password', 'confirmPassword'],
  (v) => auth.register(v),
  async () => { registerForm.reset(); await render(); }
);

wireForm(
  profileForm,
  ['name', 'email', 'bio', 'avatar'],
  (v) => auth.updateProfile(v),
  async () => {
    await render();
    setMessage(profileForm, 'Profile updated.', 'success');
  }
);

wireForm(
  usernameForm,
  ['username'],
  (v) => auth.changeUsername(v),
  async () => {
    await render();
    setMessage(usernameForm, 'Username updated.', 'success');
  }
);

wireForm(
  passwordForm,
  ['currentPassword', 'newPassword', 'confirmPassword'],
  (v) => auth.changePassword(v),
  async () => {
    passwordForm.reset();
    setMessage(passwordForm, 'Password changed.', 'success');
  }
);

/* ---------- Logout ---------- */
logoutBtn.addEventListener('click', async () => {
  await auth.logout();
  await render();
});

logoutAllBtn.addEventListener('click', async () => {
  if (!confirm('Log out of every device, including this one?')) return;
  try {
    await auth.logoutEverywhere();
  } catch (error) {
    alert(error.message);
    return;
  }
  await render();
});

// The server rejected our token (expired, or revoked from another device).
document.addEventListener('auth:expired', () => { render(); });

/* ---------- Start ---------- */
export function initProfile() {
  return render();
}