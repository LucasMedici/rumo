import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 10

const email = z.email('Informe um e-mail válido').trim().toLowerCase()
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(72, 'A senha pode ter no máximo 72 caracteres')

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha'),
})

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome').max(100),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({ email })

export const oauthProviderSchema = z.enum(['github', 'google'])
export type OAuthProvider = z.infer<typeof oauthProviderSchema>

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
