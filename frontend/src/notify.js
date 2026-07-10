// Qlobal toast API — istənilən yerdən import edib çağırmaq olur:
//   notify.error('Xəta baş verdi');  notify.success('Yadda saxlanıldı');
// ToastHost komponenti bu hadisələri dinləyib UI-da göstərir.

const dispatch = (type, message) =>
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type, message } }));

export const notify = {
  error: (message) => dispatch('error', message),
  success: (message) => dispatch('success', message),
  info: (message) => dispatch('info', message),
};
