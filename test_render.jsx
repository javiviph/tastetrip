import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.jsx';
import { AppProvider } from './src/context/AppContext.jsx';

try {
    const html = renderToString(
        <AppProvider>
            <App />
        </AppProvider>
    );
    console.log("Render successful");
} catch (e) {
    console.error("Render failed:", e);
}
