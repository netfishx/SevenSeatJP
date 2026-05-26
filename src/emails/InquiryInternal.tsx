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

function fmtAttr(label: string, attr: NonNullable<Props['utm']['firstTouch']>) {
  return `${label} : ${attr.source || '(empty)'} / ${attr.medium || '(empty)'} / ${attr.campaign || '(empty)'}`;
}

export function InquiryInternalEmail(input: Props) {
  const { utm } = input;
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'system-ui, sans-serif', color: '#222' }}>
        <Container>
          <Heading as="h1">
            新询价 {input.from} → {input.to} {input.date} {input.time}
          </Heading>

          <Section>
            <Heading as="h2">基本信息</Heading>
            <Text>服务: {input.serviceType}</Text>
            <Text>
              人数 {input.passengers} / 行李 {input.luggage}
            </Text>
            <Text>locale: {input.locale}</Text>
          </Section>

          <Hr />

          <Section>
            <Heading as="h2">客户信息</Heading>
            <Text>姓名: {input.name}</Text>
            <Text>
              首选回复渠道:{' '}
              {input.channel === 'line'
                ? 'LINE @sevenseatjp'
                : input.channel === 'wechat'
                  ? '微信 sevenseatjp'
                  : `邮箱 ${input.email ?? '(missing)'}`}
            </Text>
            {input.email && <Text>邮箱(备用): {input.email}</Text>}
            <Text>
              电话: {input.phoneCountryCode} {input.phone}
            </Text>
          </Section>

          {input.notes && (
            <>
              <Hr />
              <Section>
                <Heading as="h2">备注</Heading>
                <Text>{input.notes}</Text>
              </Section>
            </>
          )}

          <Hr />

          <Section>
            <Heading as="h2">渠道归因(请勿删，用于判断投放效果)</Heading>
            <pre
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                whiteSpace: 'pre-wrap',
                fontSize: '12px',
                background: '#f6f6f6',
                padding: '12px',
                borderRadius: '6px',
              }}
            >
              {[
                utm.firstTouch
                  ? fmtAttr('首触 source/medium/campaign', utm.firstTouch)
                  : '首触 : (none)',
                utm.firstTouch
                  ? `首触 referrer / landing     : ${utm.firstTouch.referrer || '(direct)'} / ${utm.firstTouch.landing}`
                  : '',
                utm.lastTouch
                  ? fmtAttr('末触 source/medium/campaign', utm.lastTouch)
                  : '末触 : (none)',
                utm.lastTouch
                  ? `末触 referrer / landing     : ${utm.lastTouch.referrer || '(direct)'} / ${utm.lastTouch.landing}`
                  : '',
                fmtAttr('本次 source/medium/campaign', utm.current),
                `本次 referrer / landing     : ${utm.current.referrer || '(direct)'} / ${utm.current.landing}`,
              ]
                .filter(Boolean)
                .join('\n')}
            </pre>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
