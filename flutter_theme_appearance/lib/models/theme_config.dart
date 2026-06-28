import 'package:flutter/material.dart';

class ThemeConfig {
  final Color primaryColor;
  final Color accentColor;
  final Color pageBgColor;
  final Color tileBgColor;
  final String? clientLogoPath;
  final String presetName; // 'dark', 'gold', 'green', 'light', 'custom'
  final String typography; // 'Inter', 'Mulish', 'Outfit', 'Almarai', 'Roboto'

  const ThemeConfig({
    required this.primaryColor,
    required this.accentColor,
    required this.pageBgColor,
    required this.tileBgColor,
    this.clientLogoPath,
    required this.presetName,
    required this.typography,
  });

  ThemeConfig copyWith({
    Color? primaryColor,
    Color? accentColor,
    Color? pageBgColor,
    Color? tileBgColor,
    String? clientLogoPath,
    String? presetName,
    String? typography,
    bool clearLogo = false,
  }) {
    return ThemeConfig(
      primaryColor: primaryColor ?? this.primaryColor,
      accentColor: accentColor ?? this.accentColor,
      pageBgColor: pageBgColor ?? this.pageBgColor,
      tileBgColor: tileBgColor ?? this.tileBgColor,
      clientLogoPath: clearLogo ? null : (clientLogoPath ?? this.clientLogoPath),
      presetName: presetName ?? this.presetName,
      typography: typography ?? this.typography,
    );
  }

  // Pre-defined Presets
  static const ThemeConfig dark = ThemeConfig(
    primaryColor: Color(0xFF1B2F5B),
    accentColor: Color(0xFF4A90D9),
    pageBgColor: Color(0xFFFFFFFF),
    tileBgColor: Color(0xFF16274D),
    presetName: 'dark',
    typography: 'Inter',
  );

  static const ThemeConfig gold = ThemeConfig(
    primaryColor: Color(0xFF8C6212),
    accentColor: Color(0xFFDFA62B),
    pageBgColor: Color(0xFFFCF8F2),
    tileBgColor: Color(0xFF8C6212),
    presetName: 'gold',
    typography: 'Outfit',
  );

  static const ThemeConfig green = ThemeConfig(
    primaryColor: Color(0xFF1E5E2F),
    accentColor: Color(0xFF3F9C35),
    pageBgColor: Color(0xFFF2FAF4),
    tileBgColor: Color(0xFF1E5E2F),
    presetName: 'green',
    typography: 'Mulish',
  );

  static const ThemeConfig light = ThemeConfig(
    primaryColor: Color(0xFF1B4E80),
    accentColor: Color(0xFF4DA3FF),
    pageBgColor: Color(0xFFFFFFFF),
    tileBgColor: Color(0xFFE6F2FF),
    presetName: 'light',
    typography: 'Inter',
  );
}
