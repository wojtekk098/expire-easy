import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Zresetuj hasło w {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Zresetuj hasło</Heading>
        <Text style={text}>
          Otrzymaliśmy prośbę o zmianę hasła do konta w {siteName}. Kliknij
          przycisk poniżej, aby ustawić nowe hasło.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Ustaw nowe hasło
        </Button>
        <Text style={footer}>
          Jeśli nie prosiłeś o zmianę hasła, zignoruj tę wiadomość — hasło
          pozostanie bez zmian.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '28px 32px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0F4C4C',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#0F4C4C',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
