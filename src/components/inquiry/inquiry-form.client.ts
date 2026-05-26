import { actions } from 'astro:actions';
import { readAttribution } from '@/lib/attribution.client';

const form = document.getElementById('inquiry-form') as HTMLFormElement | null;
if (!form) {
  // The form is only present on /inquiry pages; bail silently elsewhere.
  // (Astro inlines this module on any page that imports the form component.)
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  null;
}

if (form) {
  const submitBtn = form.querySelector('[type="submit"]') as HTMLButtonElement;
  const errorEl = document.getElementById(
    'inquiry-error',
  ) as HTMLParagraphElement;

  type ErrorCode =
    | 'BAD_REQUEST'
    | 'FORBIDDEN'
    | 'SERVICE_UNAVAILABLE'
    | 'INTERNAL_SERVER_ERROR'
    | 'PAYLOAD_TOO_LARGE';

  const errorMap: Record<ErrorCode, string> = {
    BAD_REQUEST: 'invalid_payload',
    FORBIDDEN: 'turnstile_failed',
    SERVICE_UNAVAILABLE: 'turnstile_unavailable',
    INTERNAL_SERVER_ERROR: 'email_send_failed',
    PAYLOAD_TOO_LARGE: 'payload_too_large',
  };

  const messages: Record<string, { ja: string; zh: string }> = {
    invalid_payload: {
      ja: '入力内容をご確認ください',
      zh: '请检查表单字段',
    },
    payload_too_large: {
      ja: 'リクエストサイズが大きすぎます',
      zh: '请求过大,请精简备注后重试',
    },
    turnstile_failed: {
      ja: '認証に失敗しました。再度お試しください',
      zh: '人机验证失败,请刷新重试',
    },
    turnstile_unavailable: {
      ja: '認証サービスに一時的に接続できません。LINE からご連絡ください',
      zh: '验证服务暂时不可用,请稍后重试或通过 LINE 联系',
    },
    email_send_failed: {
      ja: '送信に失敗しました。LINE からご連絡ください',
      zh: '提交失败,请通过 LINE 或微信联系',
    },
  };

  const success = {
    ja: 'お問合せを受け付けました。24時間以内にご返信いたします。',
    zh: '已收到您的询价,我们将在 24 小时内回复。',
  };

  const locale: 'ja' | 'zh' = document.documentElement.lang.startsWith('zh')
    ? 'zh'
    : 'ja';

  function showError(messageKey: string) {
    errorEl.textContent = messages[messageKey]?.[locale] ?? messageKey;
  }

  function clearError() {
    errorEl.textContent = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const fd = new FormData(form);
    const turnstileToken =
      (
        form.querySelector(
          '[name="cf-turnstile-response"]',
        ) as HTMLInputElement | null
      )?.value ?? '';

    if (!turnstileToken) {
      showError('turnstile_failed');
      return;
    }

    const input = {
      serviceType: fd.get('serviceType') as
        | 'airport'
        | 'charter'
        | 'ski'
        | 'rental',
      from: String(fd.get('from') ?? ''),
      to: String(fd.get('to') ?? ''),
      date: String(fd.get('date') ?? ''),
      time: String(fd.get('time') ?? ''),
      passengers: Number(fd.get('passengers')),
      luggage: Number(fd.get('luggage')),
      notes: (fd.get('notes') as string | null) || undefined,
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      lineId: (fd.get('lineId') as string | null) || undefined,
      wechat: (fd.get('wechat') as string | null) || undefined,
      phoneCountryCode: String(fd.get('phoneCountryCode') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      locale,
      utm: readAttribution(),
      turnstileToken,
    };

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');

    const { data, error } = await actions.inquiry(input);

    if (data?.ok) {
      const card = document.createElement('div');
      card.className =
        'flex flex-col items-center gap-3 p-12 bg-surface border border-border rounded-[var(--radius-card)] text-center';
      card.innerHTML = `
        <h2 class="text-2xl text-gold font-display">${
          locale === 'zh' ? '感谢您的询价' : 'お問合せありがとうございました'
        }</h2>
        <p class="text-text-muted">${success[locale]}</p>
      `;
      form.replaceWith(card);
      return;
    }

    if (error) {
      const code = (error.code as ErrorCode) ?? 'INTERNAL_SERVER_ERROR';
      showError(errorMap[code] ?? 'email_send_failed');
    }
    (
      window as Window & { turnstile?: { reset: () => void } }
    ).turnstile?.reset();
    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
  });
}
