for (const [button, dialog] of [['open-reference','reference-dialog'],['open-help','help-dialog']]) {
  document.getElementById(button).addEventListener('click', () => document.getElementById(dialog).showModal());
}
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => { const dialog = button.closest('dialog'); dialog.querySelectorAll('video').forEach(video => video.pause()); dialog.close(); }));
document.getElementById('reference-dialog').addEventListener('close', event => event.target.querySelectorAll('video').forEach(video => video.pause()));
