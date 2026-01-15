// Toast notification utility

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
  type?: ToastType;
}

const toastColors: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function showToast(message: string, options: ToastOptions = {}) {
  const { duration = 3000, type = 'success' } = options;
  
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast-notification fixed top-4 right-4 ${toastColors[type]} text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] font-medium flex items-center gap-2 animate-slide-in`;
  toast.innerHTML = `<span class="text-lg">${toastIcons[type]}</span> ${message}`;
  
  // Add animation styles if not already present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slide-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
      .animate-slide-out { animation: slide-out 0.3s ease-in forwards; }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('animate-slide-in');
    toast.classList.add('animate-slide-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export const toast = {
  success: (message: string, duration?: number) => showToast(message, { type: 'success', duration }),
  error: (message: string, duration?: number) => showToast(message, { type: 'error', duration }),
  warning: (message: string, duration?: number) => showToast(message, { type: 'warning', duration }),
  info: (message: string, duration?: number) => showToast(message, { type: 'info', duration }),
};
