# Theme & Appearance Configurator - Flutter Implementation

A Flutter widget that replicates the high-fidelity Theme & Appearance panel for customizing application themes in real-time.

## Features
- **Live Preview Box**: Interactive mini-screen displaying live updates to brand presets, colors, logos, and fonts.
- **Client Logo Upload**: Interface to upload/remove client logos.
- **Brand Presets**: Dark, Gold, Green, and Light stylized selector buttons.
- **Custom Brand Colors**: Primary and Accent color pickers.
- **Page Background**: Page background color controls with helper texts.
- **Tile Backgrounds**: Configurable tile background colors for left small tiles.
- **Typography Selection**: Dynamic dropdown selector for loading various fonts.
- **ChangeNotifier State Management**: Clean decoupling of UI and business logic using the `provider` package.

## Folder Structure
```
flutter_theme_appearance/
├── pubspec.yaml                 # Dependencies & project configuration
├── README.md                    # Setup and usage guide
└── lib/
    ├── main.dart                # Standalone entrypoint for testing
    ├── models/
    │   └── theme_config.dart    # Theme parameters model & presets definition
    ├── services/
    │   └── theme_service.dart   # ChangeNotifier theme state service
    ├── widgets/
    │   ├── expandable_card.dart # Reusable smooth collapsible sections
    │   ├── color_input_field.dart# Color preview swatch and hex text field
    │   ├── preset_selector.dart # Brand presets selector buttons
    │   └── live_preview_box.dart# Miniature preview container
    └── screens/
        └── theme_appearance_screen.dart # Main configurator view screen
```

## Setup & Running Standalone
1. Ensure Flutter is installed on your system.
2. Navigate to this directory:
   ```bash
   cd flutter_theme_appearance
   ```
3. Get packages:
   ```bash
   flutter pub get
   ```
4. Run the application:
   ```bash
   flutter run
   ```

## Integration
Wrap your root Widget with `ChangeNotifierProvider` exposing `ThemeService` and consume the `ThemeConfig` states within your application.
