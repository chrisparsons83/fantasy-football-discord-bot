declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      DISCORD_BOT_TOKEN: string;
      SESSION_SECRET: string;
      CLIENT_ID: string;
      GUILD_ID: string;
      SLEEPER_AUTH: string | undefined;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
