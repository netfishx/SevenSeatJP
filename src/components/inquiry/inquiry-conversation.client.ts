import { actions } from 'astro:actions';
import { BUTTON_STYLES } from '@/components/ui/button-styles';
import { readAttribution } from '@/lib/attribution.client';

const form = document.getElementById('inquiry-form') as HTMLFormElement | null;
if (form) {
  // Set date input min to today so the user can't pick a date in the past.
  // Server-side rendering can't know the user's "today" because the page is
  // prerendered; do this client-side as a small enhancement.
  const dateInput = document.getElementById('date') as HTMLInputElement | null;
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);

  // Progressive disclosure: only section 1 is visible at first paint.
  // "Continue" reveals the next section after validating the current one.
  const sections = Array.from(
    form.querySelectorAll<HTMLElement>('section[data-section]'),
  );
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  form.querySelectorAll<HTMLButtonElement>('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextIdx = Number(btn.dataset.next);
      const currSection = sections[nextIdx - 2];
      const isSkip =
        btn.textContent?.trim().includes('飛ばす') ||
        btn.textContent?.trim().includes('跳过');

      // Validate visible required fields in the current section before
      // revealing the next, unless this is the explicit Skip control.
      if (!isSkip && currSection) {
        const requiredFields = currSection.querySelectorAll(
          'input[required], select[required]',
        );
        let valid = true;
        for (const node of requiredFields) {
          const field = node as HTMLInputElement | HTMLSelectElement;
          if (!field.checkValidity()) {
            field.reportValidity();
            valid = false;
            break;
          }
        }
        if (!valid) return;
      }

      const next = sections[nextIdx - 1];
      if (next) {
        next.hidden = false;
        next.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }
      // Hide all "Continue" controls in the section we just left.
      currSection?.querySelectorAll<HTMLElement>('[data-next]').forEach((b) => {
        b.hidden = true;
      });
    });
  });

  const submitBtn = form.querySelector(
    'button[type="submit"]',
  ) as HTMLButtonElement;
  const submitDefault = submitBtn.querySelector(
    '[data-submit-default]',
  ) as HTMLSpanElement;
  const submitSending = submitBtn.querySelector(
    '[data-submit-sending]',
  ) as HTMLSpanElement;
  const errorEl = document.getElementById(
    'inquiry-error',
  ) as HTMLParagraphElement;
  const emailField = document.getElementById('email-field') as HTMLDivElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;

  type Channel = 'line' | 'wechat' | 'mail';
  type ErrorCode =
    | 'BAD_REQUEST'
    | 'FORBIDDEN'
    | 'SERVICE_UNAVAILABLE'
    | 'INTERNAL_SERVER_ERROR'
    | 'PAYLOAD_TOO_LARGE';

  const locale: 'ja' | 'zh' = document.documentElement.lang.startsWith('zh')
    ? 'zh'
    : 'ja';

  const errorMessages: Record<string, { ja: string; zh: string }> = {
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
      ja: '認証サービスに一時的に接続できません。LINE @sevenseatjp までご連絡ください',
      zh: '验证服务暂时不可用,请稍后重试或通过微信 sevenseatjp 联系',
    },
    email_send_failed: {
      ja: '送信に失敗しました。LINE @sevenseatjp までご連絡ください',
      zh: '提交失败,请通过微信 sevenseatjp 联系',
    },
  };

  const errorMap: Record<ErrorCode, string> = {
    BAD_REQUEST: 'invalid_payload',
    FORBIDDEN: 'turnstile_failed',
    SERVICE_UNAVAILABLE: 'turnstile_unavailable',
    INTERNAL_SERVER_ERROR: 'email_send_failed',
    PAYLOAD_TOO_LARGE: 'payload_too_large',
  };

  const successHeadline = {
    ja: 'ありがとうございました。',
    zh: '感谢您的询价。',
  } as const;

  const successBodyByChannel: Record<Channel, { ja: string; zh: string }> = {
    line: {
      ja: '24 時間以内に LINE でご連絡いたします。下のボタンから公式アカウントを追加していただくと、より早くご返信できます。',
      zh: '我们将在 24 小时内通过 LINE 与您联系。点击下方按钮添加官方账号,便于更快收到回复。',
    },
    wechat: {
      ja: '24 時間以内に WeChat でご連絡いたします。微信号 sevenseatjp を追加してお待ちください。',
      zh: '我们将在 24 小时内通过微信与您联系。请添加官方账号 sevenseatjp 等待回复。',
    },
    mail: {
      ja: '24 時間以内にご入力いただいたメールアドレスへご返信いたします。',
      zh: '我们将在 24 小时内回复至您填写的邮箱。',
    },
  };

  const channelCtaLabel: Record<Channel, { ja: string; zh: string }> = {
    line: { ja: 'LINE を開く', zh: '打开 LINE' },
    wechat: { ja: 'WeChat ID を確認', zh: '查看微信号' },
    mail: { ja: '', zh: '' },
  };

  function showError(messageKey: string) {
    errorEl.textContent = errorMessages[messageKey]?.[locale] ?? messageKey;
  }

  function clearError() {
    errorEl.textContent = '';
  }

  function selectedChannel(): Channel {
    const sel = form?.querySelector<HTMLInputElement>(
      'input[name="channel"]:checked',
    );
    return (sel?.value as Channel | undefined) ?? 'line';
  }

  function syncEmailField() {
    const isMail = selectedChannel() === 'mail';
    emailField.hidden = !isMail;
    emailInput.required = isMail;
    if (!isMail) emailInput.value = '';
  }

  // Update the indicator dot on each channel row + toggle email field.
  form
    .querySelectorAll<HTMLInputElement>('input[name="channel"]')
    .forEach((input) => {
      input.addEventListener('change', () => {
        const fieldset = document.getElementById('channel-fieldset');
        fieldset?.querySelectorAll('label').forEach((label) => {
          const radio = label.querySelector<HTMLInputElement>(
            'input[name="channel"]',
          );
          const indicator = label.querySelector<HTMLSpanElement>(
            'span[aria-hidden="true"]',
          );
          if (indicator) indicator.textContent = radio?.checked ? '●' : '○';
        });
        syncEmailField();
      });
    });

  // Initialize hidden state on load to match the recommended channel default.
  syncEmailField();

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

    const channel = selectedChannel();
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
      luggage: Number(fd.get('luggage') ?? 0),
      notes: (fd.get('notes') as string | null) || undefined,
      name: String(fd.get('name') ?? ''),
      channel,
      email: channel === 'mail' ? String(fd.get('email') ?? '') : undefined,
      phoneCountryCode: String(fd.get('phoneCountryCode') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      locale,
      utm: readAttribution(),
      turnstileToken,
    };

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitDefault.hidden = true;
    submitSending.hidden = false;

    try {
      const { data, error } = await actions.inquiry(input);

      if (data?.ok) {
        const channelKey = data.channel;
        const body = successBodyByChannel[channelKey][locale];
        const ctaLabel = channelCtaLabel[channelKey][locale];
        const ctaHref = data.deeplink ?? '';

        const success = document.createElement('section');
        success.className = 'flex flex-col gap-6 sm:gap-8 py-12 sm:py-16';
        const ctaHtml = ctaHref
          ? `<a href="${ctaHref}" target="_blank" rel="noopener" class="${BUTTON_STYLES.quiet} self-start">${ctaLabel} →</a>`
          : '';
        success.innerHTML = `
          <h2 class="font-display text-3xl sm:text-5xl leading-[1.1]">${successHeadline[locale]}</h2>
          <p class="text-text-muted leading-relaxed max-w-xl">${body}</p>
          ${ctaHtml}
        `;
        form.replaceWith(success);
        return;
      }

      if (error) {
        const code = (error.code as ErrorCode) ?? 'INTERNAL_SERVER_ERROR';
        showError(errorMap[code] ?? 'email_send_failed');
      }
    } catch (err) {
      console.error('inquiry_submit_failed', err);
      showError('email_send_failed');
    } finally {
      (
        window as Window & { turnstile?: { reset: () => void } }
      ).turnstile?.reset();
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitDefault.hidden = false;
      submitSending.hidden = true;
    }
  });
}
