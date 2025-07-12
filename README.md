# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Development

To run the application locally, use the following command:

```bash
npm run dev
```

## Deployment to Firebase App Hosting

You can deploy this application for free using Firebase App Hosting.

### Prerequisites

1.  **Install Firebase CLI:** If you don't have it, install it globally.
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase:**
    ```bash
    firebase login
    ```

### One-Time Setup

1.  **Select your Firebase Project:** Connect your local project to your Firebase project. Replace `pdf-kitolto` with your actual Firebase Project ID if it's different.
    ```bash
    firebase use pdf-kitolto
    ```

2.  **Create an App Hosting Backend:** You only need to do this once for your project.
    ```bash
    firebase apphosting:backends:create --location us-central1
    ```
    This command will create a new backend resource for your app.

### Deploying

After the initial setup, you can deploy your application any time you have new changes by running:

```bash
firebase apphosting:deploy
```

This will build your Next.js application and deploy it to Firebase App Hosting. The command will output the URL where your live application is hosted.