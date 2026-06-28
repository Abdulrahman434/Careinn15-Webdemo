import 'package:flutter/material.dart';
import '../models/theme_config.dart';

class ThemeService extends ChangeNotifier {
  ThemeConfig _currentConfig = ThemeConfig.dark;

  ThemeConfig get currentConfig => _currentConfig;

  void applyPreset(String presetName) {
    switch (presetName) {
      case 'dark':
        _currentConfig = ThemeConfig.dark.copyWith(clientLogoPath: _currentConfig.clientLogoPath);
        break;
      case 'gold':
        _currentConfig = ThemeConfig.gold.copyWith(clientLogoPath: _currentConfig.clientLogoPath);
        break;
      case 'green':
        _currentConfig = ThemeConfig.green.copyWith(clientLogoPath: _currentConfig.clientLogoPath);
        break;
      case 'light':
        _currentConfig = ThemeConfig.light.copyWith(clientLogoPath: _currentConfig.clientLogoPath);
        break;
    }
    notifyListeners();
  }

  void updatePrimaryColor(Color color) {
    _currentConfig = _currentConfig.copyWith(
      primaryColor: color,
      presetName: 'custom',
    );
    notifyListeners();
  }

  void updateAccentColor(Color color) {
    _currentConfig = _currentConfig.copyWith(
      accentColor: color,
      presetName: 'custom',
    );
    notifyListeners();
  }

  void updatePageBgColor(Color color) {
    _currentConfig = _currentConfig.copyWith(
      pageBgColor: color,
      presetName: 'custom',
    );
    notifyListeners();
  }

  void updateTileBgColor(Color color) {
    _currentConfig = _currentConfig.copyWith(
      tileBgColor: color,
      presetName: 'custom',
    );
    notifyListeners();
  }

  void uploadLogo(String path) {
    _currentConfig = _currentConfig.copyWith(
      clientLogoPath: path,
    );
    notifyListeners();
  }

  void removeLogo() {
    _currentConfig = _currentConfig.copyWith(
      clearLogo: true,
    );
    notifyListeners();
  }

  void updateTypography(String font) {
    _currentConfig = _currentConfig.copyWith(
      typography: font,
    );
    notifyListeners();
  }

  void reset() {
    _currentConfig = ThemeConfig.dark;
    notifyListeners();
  }
}
