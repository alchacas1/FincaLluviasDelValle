# Authenticated Private Visitor Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase email/password and Google authentication, make `/registros` the protected entry route, and isolate every visitor record by its authenticated owner.

**Architecture:** A small Auth service wraps the Firebase SDK, an Auth context owns session/profile initialization, and route guards prevent private UI from rendering before that initialization completes. Firestore keeps root collections `usuarios` and `registroVisitas`; owner-scoped queries and default-deny rules enforce that each UID can access only its own profile and visits.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Firebase Web SDK 12, Firestore Standard, Vitest, Testing Library, Firebase Rules Unit Testing, Firebase CLI 15.

**Spec:** `docs/superpowers/specs/2026-10-13-auth-private-records-design.md`

## Global Constraints

- Work in the current `main` checkout and preserve unrelated changes.
- Firebase project: `finca-lluvias-del-valle`; Firestore database: `(default)` Standard in `nam5`.
- Auth providers: email/password account creation and sign-in, plus Google popup sign-in.
- Google OAuth brand: `Finca Lluvias del Valle`; support email: `busticketsuna@gmail.com`, the current project owner.
- Any valid account may enter; there are no roles, administrators, or self-assigned privilege fields.
- `/registros` is the protected primary route; `/`, `/home`, and unknown routes redirect there.
- Each visit is private to `ownerUid`; no shared, update, or delete behavior is added.
- Do not retain the old shared `localStorage` cache.
- Do not print or commit passwords, access tokens, OAuth secrets, service-account keys, or `.env` values.
- Use failing tests before each production-code change and run the full suite before completion.
- Deploy only after rules tests, unit tests, lint, and build pass.

## Review Focus

- A stale profile-sync promise from a prior auth session must never expose the previous user after a rapid sign-out/sign-in; Task 2 adds an epoch-based test.
- A Google account whose email already uses password authentication must receive an actionable provider-conflict message; Task 3 pins the mapping.
- Two users sharing one browser must never see cached visits from the other account; Task 5 proves `localStorage` is not read.
- A query without `where('ownerUid', '==', uid)` must be rejected even for an authenticated user; Task 6 tests the query/rules contract.
- A group larger than the rules can validate must be stopped in the form before Firestore rejects it; Task 5 adds the ten-member boundary test.

---

### Task 1: Firebase Auth service and private profile synchronization

**Files:**
- Modify: `src/services/firebase.ts`
- Create: `src/services/auth.ts`
- Create: `src/services/auth.test.ts`

**Interfaces:**
- Produces: `getFirebaseAuth(): Auth` and keeps `getFirebaseDb(): Firestore`.
- Produces: `authService.observe(callback): Unsubscribe`.
- Produces: `authService.loginWithPassword(email, password): Promise<UserCredential>`.
- Produces: `authService.registerWithPassword(email, password): Promise<UserCredential>`.
- Produces: `authService.loginWithGoogle(): Promise<UserCredential>`.
- Produces: `authService.logout(): Promise<void>`.
- Produces: `authService.syncProfile(user): Promise<void>`.

- [ ] **Step 1: Install the locked dependencies and record the baseline**

Run:

```powershell
npm ci
npm run test:run
```

Expected: dependencies install from `package-lock.json`; the existing suite passes before new tests are added. Record any pre-existing failure by test name before proceeding.

- [ ] **Step 2: Write failing Auth service tests**

Create `src/services/auth.test.ts` with hoisted mocks for `firebase/auth`, `firebase/firestore`, and `./firebase`. Cover these exact behaviors:

```ts
it('uses Firebase email/password and Google providers', async () => {
  await authService.loginWithPassword('ana@example.com', 'secret-123')
  await authService.registerWithPassword('ana@example.com', 'secret-123')
  await authService.loginWithGoogle()

  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'ana@example.com', 'secret-123')
  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'ana@example.com', 'secret-123')
  expect(signInWithPopup).toHaveBeenCalledWith(auth, expect.any(GoogleAuthProvider))
})

it('creates a new profile with immutable and last-login timestamps', async () => {
  getDoc.mockResolvedValue({ exists: () => false })
  await authService.syncProfile(firebaseUser)

  expect(setDoc).toHaveBeenCalledWith(userRef, {
    uid: 'uid-1',
    email: 'ana@example.com',
    displayName: 'Ana',
    providers: ['google.com'],
    createdAt: serverTimestampValue,
    lastLoginAt: serverTimestampValue,
  })
})

it('updates login metadata without overwriting createdAt', async () => {
  getDoc.mockResolvedValue({ exists: () => true })
  await authService.syncProfile(firebaseUser)

  expect(updateDoc).toHaveBeenCalledWith(userRef, {
    email: 'ana@example.com',
    displayName: 'Ana',
    providers: ['google.com'],
    lastLoginAt: serverTimestampValue,
  })
  expect(setDoc).not.toHaveBeenCalled()
})
```

Use a `firebaseUser` fixture with `uid`, `email`, `displayName`, and `providerData: [{ providerId: 'google.com' }]`. Add a separate assertion that duplicate provider IDs are normalized to one entry.

- [ ] **Step 3: Run the Auth service test and verify RED**

Run:

```powershell
npm run test:run -- src/services/auth.test.ts
```

Expected: FAIL because `src/services/auth.ts` and `getFirebaseAuth` do not exist.

- [ ] **Step 4: Share one Firebase app between Auth and Firestore**

Refactor `src/services/firebase.ts` around this exact boundary:

```ts
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

let appInstance: FirebaseApp | null = null
let authInstance: Auth | null = null
let firestoreInstance: Firestore | null = null

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase no esta configurado. Revisa las variables VITE_FIREBASE_* en .env.')
  }
  if (!appInstance) appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  return appInstance
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp())
  return authInstance
}

export function getFirebaseDb(): Firestore {
  if (!firestoreInstance) firestoreInstance = getFirestore(getFirebaseApp())
  return firestoreInstance
}
```

Keep `firebaseConfig` private and keep `isFirebaseConfigured()` validating all six Vite values.

- [ ] **Step 5: Implement the Auth service minimally**

Create `src/services/auth.ts` with Firebase SDK wrappers and profile synchronization:

```ts
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type NextOrObserver,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseDb } from './firebase'

const USERS_COLLECTION = 'usuarios'

function profileData(user: User) {
  const providers = [...new Set(user.providerData.map(({ providerId }) => providerId))]
    .filter((providerId) => providerId === 'password' || providerId === 'google.com')
    .sort()
  return {
    email: user.email ?? '',
    ...(user.displayName ? { displayName: user.displayName } : {}),
    providers,
  }
}

export const authService = {
  observe(callback: NextOrObserver<User>) {
    return onAuthStateChanged(getFirebaseAuth(), callback)
  },
  loginWithPassword(email: string, password: string) {
    return signInWithEmailAndPassword(getFirebaseAuth(), email, password)
  },
  registerWithPassword(email: string, password: string) {
    return createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
  },
  loginWithGoogle() {
    return signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
  },
  logout() {
    return signOut(getFirebaseAuth())
  },
  async syncProfile(user: User): Promise<void> {
    if (!user.email) throw new Error('La cuenta autenticada no tiene un correo disponible.')
    const userRef = doc(getFirebaseDb(), USERS_COLLECTION, user.uid)
    const snapshot = await getDoc(userRef)
    const currentProfile = profileData(user)
    if (snapshot.exists()) {
      await updateDoc(userRef, { ...currentProfile, lastLoginAt: serverTimestamp() })
      return
    }
    const timestamp = serverTimestamp()
    await setDoc(userRef, {
      uid: user.uid,
      ...currentProfile,
      createdAt: timestamp,
      lastLoginAt: timestamp,
    })
  },
}
```

- [ ] **Step 6: Run the Auth service test and full suite**

Run:

```powershell
npm run test:run -- src/services/auth.test.ts
npm run test:run
```

Expected: Auth service tests and all existing tests PASS.

- [ ] **Step 7: Commit the Auth foundation**

```powershell
git add src/services/firebase.ts src/services/auth.ts src/services/auth.test.ts
git commit -m "feat: add firebase authentication service"
```

### Task 2: Session context with stale-callback protection

**Files:**
- Create: `src/auth/AuthContext.tsx`
- Create: `src/auth/AuthContext.test.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: every method from `authService`.
- Produces: `AuthProvider` and `useAuth()`.
- Produces `AuthContextValue` with `user`, `isInitializing`, `profileError`, `loginWithPassword`, `registerWithPassword`, `loginWithGoogle`, `logout`, and `retryProfileSync`.

- [ ] **Step 1: Write failing AuthProvider tests**

Mock `authService.observe` so the test captures its callback. Render a probe component inside `AuthProvider` that displays the UID, initialization state, and profile error. Add these tests:

```tsx
it('does not expose the user until the private profile is synchronized', async () => {
  const profile = deferred<void>()
  vi.mocked(authService.syncProfile).mockReturnValue(profile.promise)
  render(<AuthProvider><AuthProbe /></AuthProvider>)

  act(() => authObserver?.(userA))
  expect(screen.getByText('loading')).toBeVisible()
  expect(screen.queryByText('uid-a')).not.toBeInTheDocument()

  await act(async () => profile.resolve())
  expect(screen.getByText('uid-a')).toBeVisible()
})

it('ignores a stale profile completion after the auth user changes', async () => {
  const first = deferred<void>()
  vi.mocked(authService.syncProfile)
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce()
  render(<AuthProvider><AuthProbe /></AuthProvider>)

  act(() => authObserver?.(userA))
  await act(async () => authObserver?.(userB))
  expect(screen.getByText('uid-b')).toBeVisible()

  await act(async () => first.resolve())
  expect(screen.getByText('uid-b')).toBeVisible()
  expect(screen.queryByText('uid-a')).not.toBeInTheDocument()
})

it('keeps the session recoverable when profile synchronization fails', async () => {
  vi.mocked(authService.syncProfile).mockRejectedValueOnce(new Error('offline'))
  render(<AuthProvider><AuthProbe /></AuthProvider>)
  await act(async () => authObserver?.(userA))
  expect(screen.getByText('No fue posible preparar tu perfil.')).toBeVisible()

  vi.mocked(authService.syncProfile).mockResolvedValueOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  expect(await screen.findByText('uid-a')).toBeVisible()
})
```

Define `deferred<T>()` inside the test file and assert that unmounting calls the unsubscribe returned by `observe`.

- [ ] **Step 2: Run the AuthProvider tests and verify RED**

Run:

```powershell
npm run test:run -- src/auth/AuthContext.test.tsx
```

Expected: FAIL because the provider and hook do not exist.

- [ ] **Step 3: Implement AuthProvider with an epoch**

Implement `AuthProvider` with this state machine:

```ts
const [sessionUser, setSessionUser] = useState<User | null>(null)
const [pendingUser, setPendingUser] = useState<User | null>(null)
const [isInitializing, setIsInitializing] = useState(true)
const [profileError, setProfileError] = useState<string | null>(null)
const epochRef = useRef(0)

const initializeUser = useCallback(async (user: User, epoch: number) => {
  setPendingUser(user)
  setIsInitializing(true)
  setProfileError(null)
  try {
    await authService.syncProfile(user)
    if (epochRef.current !== epoch) return
    setSessionUser(user)
    setPendingUser(null)
  } catch {
    if (epochRef.current !== epoch) return
    setSessionUser(null)
    setProfileError('No fue posible preparar tu perfil.')
  } finally {
    if (epochRef.current === epoch) setIsInitializing(false)
  }
}, [])

useEffect(() => authService.observe((user) => {
  const epoch = ++epochRef.current
  if (!user) {
    setSessionUser(null)
    setPendingUser(null)
    setProfileError(null)
    setIsInitializing(false)
    return
  }
  void initializeUser(user, epoch)
}), [initializeUser])
```

`retryProfileSync` must increment the epoch and call `initializeUser(pendingUser, epoch)`. Context action methods delegate to `authService`; `logout` increments the epoch before awaiting `authService.logout()`.

- [ ] **Step 4: Install AuthProvider at the application root**

Wrap `Layout` and `AppRoutes` in `AuthProvider` inside `src/main.tsx`, below `BrowserRouter`:

```tsx
<BrowserRouter>
  <AuthProvider>
    <Layout>
      <AppRoutes />
    </Layout>
  </AuthProvider>
</BrowserRouter>
```

- [ ] **Step 5: Run the AuthProvider tests and full suite**

```powershell
npm run test:run -- src/auth/AuthContext.test.tsx
npm run test:run
```

Expected: all tests PASS and no state-update warning appears.

- [ ] **Step 6: Commit session management**

```powershell
git add src/auth/AuthContext.tsx src/auth/AuthContext.test.tsx src/main.tsx
git commit -m "feat: manage authenticated user sessions"
```

### Task 3: Real email/password and Google login screen

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Create: `src/pages/LoginPage.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `useAuth()` action methods from Task 2.
- Produces: `getAuthErrorMessage(error): string`.
- Produces: `/login` UI with `Correo`, `Contrasena`, `Ingresar`, `Crear cuenta`, and `Continuar con Google`.

- [ ] **Step 1: Write failing login-screen tests**

Mock `useAuth` and add these behaviors:

```tsx
it('signs in with normalized email and the entered password', async () => {
  render(<LoginPage />)
  await user.type(screen.getByLabelText('Correo'), '  ANA@Example.com ')
  await user.type(screen.getByLabelText('Contrasena'), 'secret-123')
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
  expect(loginWithPassword).toHaveBeenCalledWith('ana@example.com', 'secret-123')
})

it('creates an account only after local validation passes', async () => {
  render(<LoginPage />)
  await user.type(screen.getByLabelText('Correo'), 'ana@example.com')
  await user.type(screen.getByLabelText('Contrasena'), '123')
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
  expect(registerWithPassword).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('La contrasena debe tener al menos 6 caracteres.')
})

it('starts Google login from its dedicated action', async () => {
  render(<LoginPage />)
  await user.click(screen.getByRole('button', { name: 'Continuar con Google' }))
  expect(loginWithGoogle).toHaveBeenCalledOnce()
})

it('explains provider conflicts without exposing Firebase internals', async () => {
  loginWithGoogle.mockRejectedValue({ code: 'auth/account-exists-with-different-credential' })
  render(<LoginPage />)
  await user.click(screen.getByRole('button', { name: 'Continuar con Google' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Este correo ya usa otro metodo de acceso. Ingresa con ese metodo primero.')
})
```

Also test `auth/invalid-credential`, `auth/email-already-in-use`, `auth/too-many-requests`, `auth/popup-closed-by-user`, and an unknown error. Assert that all three actions are disabled while one is pending.

- [ ] **Step 2: Run the login tests and verify RED**

```powershell
npm run test:run -- src/pages/LoginPage.test.tsx
```

Expected: FAIL because the current screen has no credential fields or Firebase actions.

- [ ] **Step 3: Implement credential validation and error mapping**

Export this mapping from `LoginPage.tsx`:

```ts
const authMessages: Record<string, string> = {
  'auth/account-exists-with-different-credential': 'Este correo ya usa otro metodo de acceso. Ingresa con ese metodo primero.',
  'auth/email-already-in-use': 'Ya existe una cuenta con este correo.',
  'auth/invalid-credential': 'El correo o la contrasena no son correctos.',
  'auth/invalid-email': 'Ingresa un correo valido.',
  'auth/popup-closed-by-user': 'Se cerro la ventana de Google antes de completar el acceso.',
  'auth/too-many-requests': 'Hay demasiados intentos. Espera unos minutos e intenta de nuevo.',
  'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
}

export function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : ''
  return authMessages[code] ?? 'No fue posible completar el acceso. Intenta de nuevo.'
}
```

Trim and lowercase email, never trim or log the password, require a syntactically valid email, and require at least six password characters for account creation.

- [ ] **Step 4: Replace the provisional button with the complete form**

Use controlled `email`, `password`, `pendingAction`, and `error` state. The form submit calls `loginWithPassword`; the secondary button calls `registerWithPassword`; the Google button calls `loginWithGoogle`. Render errors in `<p role="alert">` and set `aria-busy` on the card while pending.

Keep the existing brand mark and visual language. Add focused CSS for `.auth-form`, `.auth-field`, `.auth-actions`, `.google-action`, and `.auth-error`; preserve the existing mobile breakpoint and visible focus styles.

- [ ] **Step 5: Run login tests, accessibility queries, and full suite**

```powershell
npm run test:run -- src/pages/LoginPage.test.tsx
npm run test:run
```

Expected: all tests PASS; labels and buttons are reachable by accessible names.

- [ ] **Step 6: Commit the login UI**

```powershell
git add src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/styles/global.css
git commit -m "feat: add email and google login"
```

### Task 4: Protected routing and real sign-out

**Files:**
- Create: `src/auth/AuthRoute.tsx`
- Create: `src/auth/AuthRoute.test.tsx`
- Modify: `src/AppRoutes.tsx`
- Create: `src/AppRoutes.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/Header.tsx`
- Delete: `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `useAuth()` session, retry, and logout behavior.
- Produces: `RequireAuth`, `PublicOnlyRoute`, and `AuthenticatedRecordsPage`.
- Changes: `App` accepts required `onExit: () => Promise<void>`.

- [ ] **Step 1: Write failing route-guard tests**

For `AuthRoute.test.tsx`, mock `useAuth` and use `MemoryRouter`:

```tsx
it('shows a loading state without rendering private children', () => {
  mockAuth({ isInitializing: true, user: null })
  render(<RequireAuth><div>Private</div></RequireAuth>)
  expect(screen.getByRole('status')).toHaveTextContent('Preparando tu cuenta')
  expect(screen.queryByText('Private')).not.toBeInTheDocument()
})

it('redirects a signed-out visitor to login', () => {
  mockAuth({ isInitializing: false, user: null })
  renderRoutesAt('/registros', <Route path="/registros" element={<RequireAuth><div>Private</div></RequireAuth>} />)
  expect(screen.getByText('Login destination')).toBeVisible()
})

it('offers retry when profile initialization failed', async () => {
  mockAuth({ isInitializing: false, user: null, profileError: 'No fue posible preparar tu perfil.' })
  render(<RequireAuth><div>Private</div></RequireAuth>)
  await user.click(screen.getByRole('button', { name: 'Reintentar' }))
  expect(retryProfileSync).toHaveBeenCalledOnce()
})
```

Test that `PublicOnlyRoute` redirects an authenticated user to `/registros`.

- [ ] **Step 2: Write failing AppRoutes and sign-out tests**

In `AppRoutes.test.tsx`, mock the route guards as pass-through components and the page components as labels. Assert:

```tsx
it.each(['/', '/home', '/unknown'])('redirects %s to the protected records route', (path) => {
  renderAt(path)
  expect(screen.getByText('Records page')).toBeVisible()
})
```

Update `App.test.tsx` to render `<App onExit={onExit} />` and verify clicking `Salir` awaits `onExit` once.

- [ ] **Step 3: Run route and App tests and verify RED**

```powershell
npm run test:run -- src/auth/AuthRoute.test.tsx src/AppRoutes.test.tsx src/App.test.tsx
```

Expected: FAIL because guards do not exist and routes still point to `/home`.

- [ ] **Step 4: Implement route guards**

`RequireAuth` must render, in order: an accessible loading state, a profile-error card with `Reintentar` and `Cerrar sesion`, `<Navigate to="/login" replace />` when signed out, or its children when authenticated. `PublicOnlyRoute` redirects authenticated users to `/registros` and otherwise renders children.

- [ ] **Step 5: Replace the route table**

Use this route shape in `AppRoutes.tsx`:

```tsx
<Routes>
  <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
  <Route path="/registros" element={<RequireAuth><AuthenticatedRecordsPage /></RequireAuth>} />
  <Route path="*" element={<Navigate to="/registros" replace />} />
</Routes>
```

`AuthenticatedRecordsPage` reads `logout` from `useAuth`, renders `<App onExit={handleExit} />`, and implements:

```ts
const handleExit = async () => {
  await logout()
  navigate('/login', { replace: true })
}
```

Delete `HomePage.tsx`. The wildcard covers `/`, `/home`, and unknown paths.

- [ ] **Step 6: Make App and Header sign-out safe**

Make `onExit` required in `AppProps`. In `Header`, use `onClick={() => void onExit()}` and disable the exit button while App tracks an `isSigningOut` flag; show a toast if logout fails and keep the private screen mounted. Add `isSigningOut: boolean` to `HeaderProps` and label the disabled action `Saliendo...`.

- [ ] **Step 7: Run focused and full tests**

```powershell
npm run test:run -- src/auth/AuthRoute.test.tsx src/AppRoutes.test.tsx src/App.test.tsx
npm run test:run
```

Expected: all tests PASS; no route renders private content before Auth completes.

- [ ] **Step 8: Commit protected navigation**

```powershell
git add src/auth/AuthRoute.tsx src/auth/AuthRoute.test.tsx src/AppRoutes.tsx src/AppRoutes.test.tsx src/App.tsx src/App.test.tsx src/components/Header.tsx src/pages/HomePage.tsx
git commit -m "feat: protect visitor routes"
```

### Task 5: Owner-scoped Firestore storage and bounded group data

**Files:**
- Modify: `src/types/visitor.ts`
- Create: `src/domain/visitorLimits.ts`
- Modify: `src/services/visitorStorage.ts`
- Modify: `src/services/visitorStorage.test.ts`
- Modify: `src/AppRoutes.tsx`
- Modify: `src/AppRoutes.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/RegistrationForm.tsx`
- Modify: `src/components/RegistrationForm.test.tsx`
- Modify: `src/components/HistoryView.test.tsx`
- Modify: `src/components/RecentEntries.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Produces: `MAX_GROUP_MEMBERS = 10`.
- Changes: `VisitorEntry` includes `ownerUid: string`.
- Changes: `visitorStorage.list(ownerUid): Promise<VisitorEntry[]>`.
- Changes: `visitorStorage.create(ownerUid, draft): Promise<VisitorEntry>`.
- Changes: `App` requires `ownerUid: string`; `AuthenticatedRecordsPage` supplies the authenticated UID.

- [ ] **Step 1: Replace local-cache tests with owner-scoped Firestore tests**

Mock Firestore functions and write these cases:

```ts
it('queries only the owner records ordered newest first', async () => {
  getDocs.mockResolvedValue({ docs: [remoteDoc] })
  await visitorStorage.list('uid-a')
  expect(where).toHaveBeenCalledWith('ownerUid', '==', 'uid-a')
  expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
  expect(localStorage.getItem).not.toHaveBeenCalled()
})

it('maps a Firestore timestamp to an ISO date', async () => {
  getDocs.mockResolvedValue({ docs: [{ id: 'visit-1', data: () => ({ ...remoteData, createdAt: { toDate: () => new Date('2026-10-13T10:00:00.000Z') } }) }] })
  await expect(visitorStorage.list('uid-a')).resolves.toEqual([
    expect.objectContaining({ id: 'visit-1', ownerUid: 'uid-a', createdAt: '2026-10-13T10:00:00.000Z' }),
  ])
})

it('writes ownership and a server timestamp but returns a renderable ISO entry', async () => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('visit-1')
  vi.setSystemTime(new Date('2026-10-13T10:00:00.000Z'))
  const entry = await visitorStorage.create('uid-a', draft)
  expect(setDoc).toHaveBeenCalledWith(expect.anything(), {
    ...draft,
    id: 'visit-1',
    ownerUid: 'uid-a',
    createdAt: serverTimestampValue,
  })
  expect(entry.createdAt).toBe('2026-10-13T10:00:00.000Z')
})

it('propagates a remote read failure instead of returning shared local data', async () => {
  localStorage.setItem('finca-lluvias:visitors:v1', JSON.stringify([{ id: 'other-user' }]))
  getDocs.mockRejectedValue(new Error('permission-denied'))
  await expect(visitorStorage.list('uid-a')).rejects.toThrow('No fue posible cargar los ingresos registrados.')
})
```

Update the App test to render `<App ownerUid="uid-a" onExit={onExit} />`, expect `visitorStorage.list('uid-a')`, and expect a successful submit to call `visitorStorage.create('uid-a', draft)`.

- [ ] **Step 2: Add the failing ten-member boundary test**

In `RegistrationForm.test.tsx`, select `Grupo`, add ten complete members, then attempt an eleventh. Assert that the list remains at ten and the warning reads `Puedes agregar un maximo de 10 integrantes.`.

- [ ] **Step 3: Run storage and form tests and verify RED**

```powershell
npm run test:run -- src/services/visitorStorage.test.ts src/components/RegistrationForm.test.tsx src/App.test.tsx
```

Expected: FAIL because storage has no UID arguments, still reads localStorage, and the form has no member limit.

- [ ] **Step 4: Implement the Firestore-only adapter**

Use this query and write shape:

```ts
const visitsQuery = query(
  collection(getFirebaseDb(), VISITS_COLLECTION),
  where('ownerUid', '==', ownerUid),
  orderBy('createdAt', 'desc'),
)

await setDoc(doc(getFirebaseDb(), VISITS_COLLECTION, id), {
  ...draft,
  id,
  ownerUid,
  createdAt: serverTimestamp(),
})
```

Delete `STORAGE_KEY`, `readEntries`, `persistLocal`, configuration fallbacks, and every `localStorage` access. Convert timestamp-like values with a guarded `toDate()` call; reject malformed remote records rather than casting them blindly. Translate read and write errors to the existing Spanish messages.

- [ ] **Step 5: Add the shared application/rules group limit**

Create `src/domain/visitorLimits.ts`:

```ts
export const MAX_GROUP_MEMBERS = 10
```

Before creating `nextMember`, check `values.groupMembers.length >= MAX_GROUP_MEMBERS`, set `memberError`, and show the same warning toast. Do not change existing required-field behavior.

- [ ] **Step 6: Connect the authenticated UID and update fixtures/documentation**

Add `ownerUid` to `VisitorEntry` and every saved-entry fixture in App, HistoryView, RecentEntries, and storage tests. Make `App` require `ownerUid`, pass it to both storage methods, and include it in the loading-effect dependency list. Change `AuthenticatedRecordsPage` to read the non-null user from `useAuth` and render `<App ownerUid={user.uid} onExit={handleExit} />`. Update README to state that Firestore is the only source of truth, `usuarios/{uid}` stores the private profile, and `registroVisitas.ownerUid` isolates records. Remove the Cache local section.

- [ ] **Step 7: Run focused tests and the full suite**

```powershell
npm run test:run -- src/services/visitorStorage.test.ts src/components/RegistrationForm.test.tsx src/App.test.tsx
npm run test:run
```

Expected: all tests PASS and no test depends on browser storage.

- [ ] **Step 8: Commit private storage**

```powershell
git add src/types/visitor.ts src/domain/visitorLimits.ts src/services/visitorStorage.ts src/services/visitorStorage.test.ts src/AppRoutes.tsx src/AppRoutes.test.tsx src/App.tsx src/App.test.tsx src/components/RegistrationForm.tsx src/components/RegistrationForm.test.tsx src/components/HistoryView.test.tsx src/components/RecentEntries.test.tsx README.md
git commit -m "feat: scope visitor records by user"
```

### Task 6: Permanent default-deny Firestore rules, index, and Auth configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `firebase.json`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`
- Create: `tests/firestore.rules.test.ts`
- Temporary, do not commit: `.superpowers/firestore-rules-analysis.md`

**Interfaces:**
- Consumes: profile schema from Task 1, `MAX_GROUP_MEMBERS = 10`, and owner query from Task 5.
- Produces: deployable Auth configuration, Firestore rules, and composite index.

- [ ] **Step 1: Document the complete Firestore surface before editing rules**

Create `.superpowers/firestore-rules-analysis.md` as an untracked working note containing:

```markdown
# Firestore rules analysis
- Collections: usuarios/{uid}, registroVisitas/{registroId}
- Auth: Firebase email/password and Google; no anonymous access.
- usuarios operations: owner get/create/update; no list/delete.
- registroVisitas operations: owner create/get/list; no update/delete.
- Query: ownerUid == authenticated UID, createdAt descending.
- Visit fields: id, ownerUid, firstName, firstLastName, secondLastName, identification, visitDate, nationality, visitorType, entryMode, groupMembers, createdAt.
- Group members: at most 10 maps containing id, fullName, identification, visitorType.
- Authority: request.auth.uid and request.auth.token.email only; never client roles.
```

Confirm with:

```powershell
rg -n "collection\(|doc\(|getDoc|getDocs|setDoc|updateDoc|deleteDoc|where\(|orderBy\(" src
```

- [ ] **Step 2: Install the rules test library and add scripts**

Run:

```powershell
npm install --save-dev @firebase/rules-unit-testing
```

Add scripts:

```json
"test:rules": "vitest run tests/firestore.rules.test.ts",
"test:rules:emulator": "firebase emulators:exec --only firestore \"npm run test:rules\""
```

- [ ] **Step 3: Write failing Firestore rules tests**

Create `tests/firestore.rules.test.ts` with `initializeTestEnvironment`, `assertFails`, `assertSucceeds`, `serverTimestamp`, `where`, and `orderBy`. Use `user-a` and `user-b` authenticated contexts with distinct emails. Cover:

```ts
it('denies every anonymous read and write', async () => {
  const anonymousDb = testEnv.unauthenticatedContext().firestore()
  await assertFails(getDocs(collection(anonymousDb, 'registroVisitas')))
  await assertFails(setDoc(doc(anonymousDb, 'registroVisitas', 'visit-a'), validVisit('user-a', 'visit-a')))
})

it('allows an owner query and rejects an unconstrained query', async () => {
  const db = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()
  await assertSucceeds(getDocs(query(
    collection(db, 'registroVisitas'),
    where('ownerUid', '==', 'user-a'),
    orderBy('createdAt', 'desc'),
  )))
  await assertFails(getDocs(query(collection(db, 'registroVisitas'), orderBy('createdAt', 'desc'))))
})

it('rejects cross-user reads and forged ownership', async () => {
  const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()
  await assertFails(getDoc(doc(dbA, 'registroVisitas', 'visit-b')))
  await assertFails(setDoc(doc(dbA, 'registroVisitas', 'visit-forged'), validVisit('user-b', 'visit-forged')))
})

it('allows only an owner profile whose email matches the token', async () => {
  const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()
  await assertSucceeds(setDoc(doc(dbA, 'usuarios', 'user-a'), validProfile('user-a', 'a@example.com')))
  await assertFails(setDoc(doc(dbA, 'usuarios', 'user-b'), validProfile('user-b', 'a@example.com')))
  await assertFails(setDoc(doc(dbA, 'usuarios', 'user-a'), validProfile('user-a', 'spoof@example.com')))
})

it('allows safe profile refreshes but rejects createdAt and schema changes', async () => {
  const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()
  await assertSucceeds(setDoc(doc(dbA, 'usuarios', 'user-a'), validProfile('user-a', 'a@example.com')))
  await assertSucceeds(updateDoc(doc(dbA, 'usuarios', 'user-a'), { lastLoginAt: serverTimestamp() }))
  await assertFails(updateDoc(doc(dbA, 'usuarios', 'user-a'), { createdAt: serverTimestamp() }))
  await assertFails(updateDoc(doc(dbA, 'usuarios', 'user-a'), { role: 'admin' }))
})

it('rejects schema pollution, oversize members, updates, and deletes', async () => {
  const dbA = testEnv.authenticatedContext('user-a', { email: 'a@example.com' }).firestore()
  await assertFails(setDoc(doc(dbA, 'registroVisitas', 'extra'), { ...validVisit('user-a', 'extra'), extraData: 'blocked' }))
  await assertFails(setDoc(doc(dbA, 'registroVisitas', 'large'), { ...validVisit('user-a', 'large'), groupMembers: Array.from({ length: 11 }, validMember) }))
  await assertFails(updateDoc(doc(dbA, 'registroVisitas', 'visit-a'), { nationality: 'Otra' }))
  await assertFails(deleteDoc(doc(dbA, 'registroVisitas', 'visit-a')))
})
```

Seed `visit-a` and `visit-b` inside `testEnv.withSecurityRulesDisabled`. The `validVisit` helper must use `serverTimestamp()` and all twelve required fields; `validProfile` must use `serverTimestamp()` for both timestamps.

- [ ] **Step 4: Run the rules tests and verify RED**

Run:

```powershell
java -version
firebase emulators:exec --only firestore "npm run test:rules"
```

Expected: Java is available; rules tests FAIL because `firestore.rules` is not configured.

- [ ] **Step 5: Create strict prototype rules**

Create `firestore.rules` with documented models, helpers, and these exact decisions:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Assumed data model:
    // usuarios/{uid}: uid, email, optional displayName, providers,
    // createdAt, lastLoginAt. Private to the matching authenticated UID.
    // registroVisitas/{registroId}: id, ownerUid, firstName,
    // firstLastName, secondLastName, identification, visitDate,
    // nationality, visitorType, entryMode, groupMembers, createdAt.
    // Visits are created/read only by ownerUid; client updates/deletes are denied.
    function signedIn() { return request.auth != null; }
    function owns(userId) { return signedIn() && request.auth.uid == userId; }
    function validOptionalDisplayName(data) {
      return !('displayName' in data) ||
        (data.displayName is string && data.displayName.size() > 0 && data.displayName.size() <= 100);
    }
    function validProviders(providers) {
      return providers is list && providers.size() > 0 && providers.size() <= 2 &&
        providers.toSet().hasOnly(['password', 'google.com']);
    }
    function validUser(data, userId) {
      return data.keys().hasAll(['uid', 'email', 'providers', 'createdAt', 'lastLoginAt']) &&
        data.keys().hasOnly(['uid', 'email', 'displayName', 'providers', 'createdAt', 'lastLoginAt']) &&
        data.uid is string && data.uid == userId && data.uid == request.auth.uid &&
        data.email is string && data.email.size() > 3 && data.email.size() <= 254 &&
        data.email == request.auth.token.email &&
        validOptionalDisplayName(data) && validProviders(data.providers) &&
        data.createdAt is timestamp && data.lastLoginAt is timestamp;
    }
    function validMember(member) {
      return member is map &&
        member.keys().hasAll(['id', 'fullName', 'identification', 'visitorType']) &&
        member.keys().hasOnly(['id', 'fullName', 'identification', 'visitorType']) &&
        member.id is string && member.id.size() > 0 && member.id.size() <= 36 &&
        member.fullName is string && member.fullName.size() > 0 && member.fullName.size() <= 120 &&
        member.identification is string && member.identification.size() > 0 && member.identification.size() <= 50 &&
        member.visitorType in ['child', 'adult'];
    }
    function validMembers(members) {
      return members is list && members.size() <= 10 &&
        (members.size() <= 0 || validMember(members[0])) &&
        (members.size() <= 1 || validMember(members[1])) &&
        (members.size() <= 2 || validMember(members[2])) &&
        (members.size() <= 3 || validMember(members[3])) &&
        (members.size() <= 4 || validMember(members[4])) &&
        (members.size() <= 5 || validMember(members[5])) &&
        (members.size() <= 6 || validMember(members[6])) &&
        (members.size() <= 7 || validMember(members[7])) &&
        (members.size() <= 8 || validMember(members[8])) &&
        (members.size() <= 9 || validMember(members[9]));
    }
    function validVisit(data, visitId) {
      return data.keys().hasAll([
          'id', 'ownerUid', 'firstName', 'firstLastName', 'secondLastName',
          'identification', 'visitDate', 'nationality', 'visitorType',
          'entryMode', 'groupMembers', 'createdAt'
        ]) &&
        data.keys().hasOnly([
          'id', 'ownerUid', 'firstName', 'firstLastName', 'secondLastName',
          'identification', 'visitDate', 'nationality', 'visitorType',
          'entryMode', 'groupMembers', 'createdAt'
        ]) &&
        data.id is string && data.id == visitId && data.id.size() <= 36 &&
        data.ownerUid is string && data.ownerUid == request.auth.uid &&
        data.firstName is string && data.firstName.size() > 0 && data.firstName.size() <= 80 &&
        data.firstLastName is string && data.firstLastName.size() > 0 && data.firstLastName.size() <= 80 &&
        data.secondLastName is string && data.secondLastName.size() > 0 && data.secondLastName.size() <= 80 &&
        data.identification is string && data.identification.size() > 0 && data.identification.size() <= 50 &&
        data.visitDate is string && data.visitDate.matches('^\\d{4}-\\d{2}-\\d{2}$') &&
        data.nationality is string && data.nationality.size() > 0 && data.nationality.size() <= 80 &&
        data.visitorType in ['child', 'adult'] && data.entryMode in ['individual', 'group'] &&
        validMembers(data.groupMembers) &&
        ((data.entryMode == 'individual' && data.groupMembers.size() == 0) ||
         (data.entryMode == 'group' && data.groupMembers.size() > 0)) &&
        data.createdAt is timestamp && data.createdAt == request.time;
    }

    match /usuarios/{userId} {
      allow get: if owns(userId);
      allow list: if false;
      allow create: if owns(userId) && validUser(request.resource.data, userId) &&
        request.resource.data.createdAt == request.time &&
        request.resource.data.lastLoginAt == request.time;
      allow update: if owns(userId) && validUser(request.resource.data, userId) &&
        request.resource.data.createdAt == resource.data.createdAt &&
        request.resource.data.lastLoginAt == request.time &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['email', 'displayName', 'providers', 'lastLoginAt']);
      allow delete: if false;
    }

    match /registroVisitas/{visitId} {
      allow get, list: if signedIn() && resource.data.ownerUid == request.auth.uid;
      allow create: if signedIn() && validVisit(request.resource.data, visitId);
      allow update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 6: Configure the composite index and Firebase services**

Create `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "registroVisitas",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ownerUid", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Extend `firebase.json` with:

```json
"firestore": {
  "database": "(default)",
  "rules": "firestore.rules",
  "indexes": "firestore.indexes.json"
},
"auth": {
  "providers": {
    "emailPassword": true,
    "googleSignIn": {
      "oAuthBrandDisplayName": "Finca Lluvias del Valle",
      "supportEmail": "busticketsuna@gmail.com",
      "authorizedRedirectUris": [
        "https://finca-lluvias-del-valle.firebaseapp.com/__/auth/handler"
      ]
    }
  }
}
```

Keep the existing Hosting block unchanged.

- [ ] **Step 7: Run rules tests, syntax validation, and devil's-advocate cases**

Run:

```powershell
firebase emulators:exec --only firestore "npm run test:rules"
firebase deploy --only firestore:rules --dry-run
```

Expected: every authorized case succeeds; anonymous, cross-user, schema-pollution, forged-ID, forged-owner, oversize-list, update, and delete cases fail; dry run exits 0.

Delete the temporary `.superpowers/firestore-rules-analysis.md` only after comparing every documented path and query against the final rules.

- [ ] **Step 8: Audit the final rules as an attacker**

Record the audit result in the implementation notes using the required JSON shape. The expected score is 5 only if tests demonstrate no public access, authority comes from Auth, no create/update asymmetry exists, all strings/lists are bounded, and owner identity accompanies field restrictions. If any test exposes a bypass, fix the rules and repeat Step 7 before committing.

- [ ] **Step 9: Commit Firebase policy and configuration**

```powershell
git add package.json package-lock.json firebase.json firestore.rules firestore.indexes.json tests/firestore.rules.test.ts
git commit -m "feat: secure firestore by authenticated owner"
```

### Task 7: Complete verification, production deployment, and readback

**Files:**
- Modify: `README.md`
- Modify only if verification exposes a focused defect: files from Tasks 1-6

**Interfaces:**
- Consumes: the complete authenticated application and Firebase configuration.
- Produces: verified production Auth providers, rules, index, Hosting bundle, and zero test residue.

- [ ] **Step 1: Finish operator documentation**

Document in README:

- Account creation and email/password or Google sign-in.
- Private per-user visit ownership.
- Required `.env` keys without values.
- Firebase deploy commands for Auth, Firestore, and Hosting.
- `npm run test:rules:emulator` and Java requirement.
- The fact that Firestore creates `usuarios` when the first profile document is written.

- [ ] **Step 2: Run fresh automated verification**

Run in this order:

```powershell
npm run test:run
npm run test:rules:emulator
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0 with no test failure, lint error, TypeScript error, build error, or whitespace error.

- [ ] **Step 3: Review the production diff and repository state**

Run:

```powershell
git status --short --branch
git diff --stat origin/main...HEAD
git diff origin/main...HEAD -- firebase.json firestore.rules firestore.indexes.json src/services src/auth src/pages src/AppRoutes.tsx src/App.tsx README.md
```

Expected: only the approved authentication, ownership, security, tests, documentation, and design/plan commits are present.

- [ ] **Step 4: Deploy Auth and verify providers before exposing private routes**

Run:

```powershell
firebase deploy --only auth --project finca-lluvias-del-valle
```

Read back `https://identitytoolkit.googleapis.com/admin/v2/projects/finca-lluvias-del-valle/config` with an access token captured in memory, and print only:

- email/password enabled state,
- Google provider enabled state,
- authorized domains,
- OAuth display name and support email.

Expected: email/password and Google are enabled; `finca-lluvias-del-valle.web.app`, `finca-lluvias-del-valle.firebaseapp.com`, and `localhost` are authorized. If one of these three domains is absent, patch `authorizedDomains` through the same Admin v2 endpoint with the union of the current list and those exact domains, then read back again.

- [ ] **Step 5: Deploy rules and wait for the required index**

Run:

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project finca-lluvias-del-valle
firebase firestore:indexes --project finca-lluvias-del-valle
```

Expected: the rules release succeeds and the `ownerUid ASC / createdAt DESC` index reaches `READY`. Do not deploy Hosting while the index is building.

- [ ] **Step 6: Deploy the tested Hosting bundle**

Run:

```powershell
firebase deploy --only hosting --project finca-lluvias-del-valle
```

Expected: deployment succeeds to `https://finca-lluvias-del-valle.web.app`.

- [ ] **Step 7: Perform an authenticated browser smoke test**

At the production URL:

1. Confirm `/`, `/home`, and an unknown path all resolve to `/login` while signed out.
2. Capture the aggregate `registroVisitas` count as the pre-smoke baseline.
3. Create a temporary email/password account with a unique `codex-smoke-<timestamp>@example.com` address and a generated password that is never printed.
4. Confirm authentication redirects to `/registros` and creates `usuarios/{uid}`.
5. Create one individual visit with synthetic values `Prueba`, `Automatica`, `Temporal`, `TEST-<timestamp>`, Costa Rica, Adulto.
6. Confirm the visit appears in Recientes and Historial after a reload.
7. Sign out and confirm `/registros` returns to `/login`.
8. Confirm the Google button opens the configured Google provider; complete Google authentication only if the browser already has an explicitly usable account session.

- [ ] **Step 8: Verify isolation and remove all smoke-test data**

Using authenticated REST calls or the Admin API:

1. Confirm the smoke user's query returns exactly its own test visit.
2. Confirm an unauthenticated Firestore request is denied.
3. Delete the synthetic visit and `usuarios/{uid}` profile by their exact document paths using administrator credentials.
4. Delete the temporary Firebase Auth account by its exact UID.
5. Read back the visit path, profile path, and Auth account; all three must report not found.
6. Run the aggregate count for `registroVisitas`; it must equal the pre-smoke baseline so concurrent legitimate records are neither mistaken for residue nor removed.

- [ ] **Step 9: Run final local verification and commit documentation**

```powershell
npm run test:run
npm run test:rules:emulator
npm run lint
npm run build
git diff --check
git add README.md
git commit -m "docs: document authenticated visitor access"
git status --short --branch
```

Expected: all checks pass and the working tree is clean. Report the deployed release, provider/rules/index readback, browser results, cleanup readback, and exact commands executed.
