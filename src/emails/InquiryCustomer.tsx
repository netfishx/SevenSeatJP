import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Section,
  Text,
} from 'react-email';
import type { InquiryPayload } from '@/lib/schemas/inquiry';

type Props = InquiryPayload;

const copy = {
  ja: {
    greeting: 'お問合せいただきありがとうございます。',
    received:
      '以下の内容でお見積りリクエストを承りました。24 時間以内に担当者よりご返信いたします。',
    summary: 'お問合せ内容',
    serviceLabel: 'サービス',
    routeLabel: '区間',
    dateLabel: '日時',
    paxLabel: '人数 / 荷物',
    contact:
      'ご質問はこのメールに直接ご返信いただくか、LINE @sevenseatjp までお気軽にどうぞ。',
    sign: 'SevenSeatJP チーム',
  },
  zh: {
    greeting: '感谢您的询价。',
    received: '我们已收到以下询价内容，将在 24 小时内由专人回复。',
    summary: '询价内容',
    serviceLabel: '服务',
    routeLabel: '行程',
    dateLabel: '日期 / 时间',
    paxLabel: '人数 / 行李',
    contact:
      '有任何疑问可直接回复本邮件，或通过 LINE @sevenseatjp / 微信 sevenseatjp 联系我们。',
    sign: 'SevenSeatJP 团队',
  },
} as const;

const serviceMap = {
  airport: { ja: '空港送迎', zh: '机场接送' },
  charter: { ja: 'チャーター', zh: '私人包车' },
  ski: { ja: 'スキー送迎', zh: '滑雪接送' },
  rental: { ja: 'レンタル', zh: '租车' },
} as const;

export function InquiryCustomerEmail(input: Props) {
  const c = copy[input.locale];
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', color: '#222' }}>
        <Container>
          <Heading as="h1">{c.greeting}</Heading>
          <Text>
            {input.name} 様
            <br />
            {c.received}
          </Text>

          <Hr />

          <Section>
            <Heading as="h2">{c.summary}</Heading>
            <Text>
              {c.serviceLabel}: {serviceMap[input.serviceType][input.locale]}
            </Text>
            <Text>
              {c.routeLabel}: {input.from} → {input.to}
            </Text>
            <Text>
              {c.dateLabel}: {input.date} {input.time}
            </Text>
            <Text>
              {c.paxLabel}: {input.passengers} / {input.luggage}
            </Text>
          </Section>

          <Hr />

          <Text>{c.contact}</Text>
          <Text>{c.sign}</Text>
        </Container>
      </Body>
    </Html>
  );
}
