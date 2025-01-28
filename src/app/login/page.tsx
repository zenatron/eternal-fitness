import { login, signup } from './actions'

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 p-6 rounded shadow-md space-y-4 min-w-[400px]">
        <h1 className="text-2xl font-bold text-center gradient-text-blue">Welcome to Eternal Fitness</h1>
        <form className="flex flex-col space-y-4">
          <div>
            <label htmlFor="email" className="form-item-heading">Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              className="form-input"
              placeholder="you@example.com"
              required 
            />
          </div>
          <div>
            <label htmlFor="password" className="form-item-heading">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              className="form-input"
              placeholder="••••••••"
              required 
            />
          </div>
          <button 
            formAction={login}
            className="btn btn-primary w-full"
          >
            Log in
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or</span>
            </div>
          </div>
          <button 
            formAction={signup}
            className="btn btn-secondary w-full"
          >
            Create new account
          </button>
        </form>
      </div>
    </div>
  )
}