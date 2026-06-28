import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/theme_service.dart';
import 'screens/theme_appearance_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeService()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Theme & Appearance Configurator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Inter',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0B152B),
        ),
      ),
      home: const Scaffold(
        backgroundColor: Color(0xFF0B152B), // Dark background matching design context
        body: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(16.0),
            child: ThemeAppearanceScreen(),
          ),
        ),
      ),
    );
  }
}
