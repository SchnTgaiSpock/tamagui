import React, { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useSupabaseClient } from '~/features/auth/useSupabaseClient'
import { useRouter } from 'vxs'
import { Spinner, YStack } from 'tamagui'

const SupabaseSessionContext = React.createContext<Session | null>(null)
const SupabaseSessionInitializedContext = React.createContext<boolean>(false)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabaseClient()
  const [isSessionInitialized, setIsSessionInitialized] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Supabase client is not ready yet, skip for this time.
    if (!supabase) return

    // Listen to auth state changes, and update the session accordingly.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Initially get the session from the client.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsSessionInitialized(true)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <SupabaseSessionInitializedContext.Provider value={isSessionInitialized}>
      <SupabaseSessionContext.Provider value={session}>
        {children}
      </SupabaseSessionContext.Provider>
    </SupabaseSessionInitializedContext.Provider>
  )
}

const SIGN_IN_PATH = '/sign-in'

/**
 * Returns the current session from the Supabase client.
 *
 * TODO: Maybe move this function elsewhere for better organization. There's another `useSupabaseSession` in `useSupabaseClient.ts` and we'll need to clarify the difference between the two.
 */
export function useSupabaseSession() {
  const session = React.useContext(SupabaseSessionContext)
  return session
}

/**
 * A hook that redirects the user to the sign in page if they are not signed in.
 *
 * Consider using the `UserAuthenticatedGuard` component if you don't want the content of a page to be rendered until we confirm the user is authenticated.
 *
 * TODO: Maybe move this function elsewhere for better organization.
 */
export function useProtectedRoute() {
  const isSessionInitialized = React.useContext(SupabaseSessionInitializedContext)
  const session = useSupabaseSession()
  const user = session?.user

  const router = useRouter()

  useEffect(() => {
    if (!isSessionInitialized) {
      // Session is not initialized yet, do nothing.
      return
    }

    if (!user) {
      // User is not signed in, redirect to sign in page.
      router.replace(SIGN_IN_PATH)
    }
  }, [isSessionInitialized, user, router])
}

const DEFAULT_LOADING_CONTENT = (
  <YStack ai="center" flex={1} jc="center">
    <Spinner size="large" />
  </YStack>
)

/**
 * Delays rendering of children until we know the user is authenticated.
 * Will redirect the user to the sign in page if they are not signed in.
 *
 * TODO: Maybe move this elsewhere for better organization.
 */
export function UserAuthenticatedGuard({
  children,
  loading,
}: { children: React.ReactNode; loading?: React.ReactNode }) {
  useProtectedRoute()
  const session = useSupabaseSession()

  if (!session) {
    // We don't need to do anything here as `useProtectedRoute()` will handle the redirection after the session is initialized.
    return loading || DEFAULT_LOADING_CONTENT
  }

  return children
}
