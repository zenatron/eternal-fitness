# Eternal Fitness
A personalized fitness application that helps users track, create, and maintain their workout routines.

## 📄 Abstract
Eternal Fitness is a comprehensive workout planning and tracking application built with Next.js and TypeScript. It allows users to create personalized workout routines, track their progress, and maintain consistency in their fitness journey. With features like workout generation, exercise tracking, and profile management, the app serves as a digital fitness companion for users of all fitness levels.

## 🪄 Features
- **Personalized Workout Creation:** Generate workout plans tailored to your fitness goals, preferred workout splits, and available time.
- **Progress Tracking:** Monitor your completed workouts, current weight, height, and other fitness metrics over time.
- **Dark/Light Theme Support:** Enjoy a comfortable user experience with automatic theme switching based on your device preferences.
- **Responsive Design:** Access your fitness data on any device with a fully responsive interface.
- **User Authentication:** Secure login and account management through Clerk authentication.
- **Unit Conversion:** Toggle between metric and imperial measurements based on your preference.

## 💾 Installation
### Requirements
- Node.js 18+
- Next.js 15+
- pnpm
- PostgreSQL database
- Clerk account for authentication

### Installation Steps
1. **Clone the repository:**
```bash
git clone https://github.com/zenatron/eternal-fitness.git
```
2. **Navigate into the directory:**
```bash
cd eternal-fitness
```
3. **Install dependencies:**
```bash
pnpm install
```
4. **Additional configuration:**
   - Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/eternal_fitness
   DIRECT_URL=postgresql://username:password@localhost:5432/eternal_fitness
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```
   - Set up your Clerk account and obtain the necessary API keys
   - Run Prisma migrations to set up the database schema:
   ```bash
   pnpm prisma migrate dev
   ```

## ⚙️ Usage
1. **Start the development server:**
```bash
pnpm dev
```
2. **Build for production:**
```bash
pnpm build
```
3. **Run production server:**
```bash
pnpm start
```

The application will be available at `http://localhost:3000`.

## 💬 Contribution
Contributions are welcome! To contribute:
1. **Fork the repository.**
2. **Create a new branch** for your feature or bug fix.
3. **Commit your changes** with clear commit messages.
4. **Push your branch** to your fork.
5. **Submit a pull request** detailing your changes.

### Code of Conduct
Please be respectful and inclusive when contributing to this project. We aim to create a welcoming environment for all contributors regardless of experience level.

## 🧪 Tests
Run tests using Jest:
```bash
pnpm test
```

For watching tests during development:
```bash
pnpm test:watch
```

## ©️ License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Acknowledgements
- [Next.js](https://nextjs.org/) - The React framework for production
- [Clerk](https://clerk.dev/) - Authentication and user management
- [Prisma](https://www.prisma.io/) - Database ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Headless UI](https://headlessui.com/) - Unstyled UI components

## ✉️ Contact
For any questions or support, please contact:
- **GitHub:** [Project Repository](https://github.com/zenatron/eternal-fitness)