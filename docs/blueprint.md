# **App Name**: Ixen

## Core Features:

- Stream Connection Form: Display a form to enter a TikTok username and a button to connect to the live stream.
- TikTok Live Stream Connector: Establish a connection to the TikTok live stream using the tiktok-live-connector library. Manage the connection lifecycle (connect, disconnect, error).
- AI Comment Classification: Use a GenKit flow, acting as a tool, to analyze and classify incoming comments into 'Purchase Intent', 'Question', or 'General' categories.
- Categorized Comment Display: Display categorized comments in three distinct columns: 'Purchase Intent', 'Questions', and 'General Chat'.
- Connection Status Indicator: Display status updates to the user (e.g., 'Connecting...', 'Connected', 'Error').

## Style Guidelines:

- Primary color: Saturated blue (#4285F4) to convey trust and reliability, fitting for a real-time data analysis tool.
- Background color: Light blue (#E8F0FE), a desaturated shade of the primary color, for a clean and unobtrusive backdrop.
- Accent color: Yellow-orange (#F4B400), an analogous color, for highlighting important information and calls to action.
- Font: 'Inter' (sans-serif) for a modern, neutral, and readable interface, suitable for both headings and real-time displayed content.
- A clean, responsive layout with clear divisions for the input form, status display, and categorized comment sections.