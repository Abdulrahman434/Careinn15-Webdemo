import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';
import '../widgets/expandable_card.dart';
import '../widgets/color_input_field.dart';
import '../widgets/preset_selector.dart';
import '../widgets/live_preview_box.dart';

class ThemeAppearanceScreen extends StatelessWidget {
  const ThemeAppearanceScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final themeService = Provider.of<ThemeService>(context);
    final config = themeService.currentConfig;

    return Center(
      child: Container(
        width: 400,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                color: const Color(0xFF0B152B),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  children: [
                    const Text(
                      'Theme & Appearance',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: themeService.reset,
                      child: Row(
                        children: const [
                          Icon(
                            Icons.rotate_left,
                            size: 16,
                            color: Color(0xFFCBD5E1),
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Reset',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFFCBD5E1),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    GestureDetector(
                      onTap: () {
                        // Normally closes the dialog or screen
                      },
                      child: const Icon(
                        Icons.close,
                        size: 20,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              // Scrollable content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Section 1: Live Preview
                      ExpandableCard(
                        title: 'Live Preview',
                        icon: const Icon(Icons.remove_red_eye_outlined, size: 18, color: Color(0xFF64748B)),
                        initialExpanded: true,
                        child: LivePreviewBox(config: config),
                      ),
                      
                      // Section 2: Client Brand Logo
                      ExpandableCard(
                        title: 'Client Brand Logo',
                        icon: const Icon(Icons.business_outlined, size: 18, color: Color(0xFF64748B)),
                        initialExpanded: true,
                        child: config.clientLogoPath != null
                            ? Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.image, color: Colors.grey),
                                    const SizedBox(width: 8),
                                    const Expanded(
                                      child: Text(
                                        'custom_logo.png',
                                        style: TextStyle(fontSize: 13, color: Color(0xFF334155)),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                                      onPressed: themeService.removeLogo,
                                    ),
                                  ],
                                ),
                              )
                            : GestureDetector(
                                onTap: () {
                                  themeService.uploadLogo('assets/custom_logo.png');
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 24),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: const Color(0xFFE2E8F0),
                                      style: BorderStyle.none, // Custom dashed border simulator
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                    color: const Color(0xFFF8FAFC),
                                  ),
                                  // Simplified dashed border representation in Flutter
                                  child: Container(
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: const Color(0xFFE2E8F0),
                                        style: BorderStyle.solid,
                                      ),
                                    ),
                                    padding: const EdgeInsets.all(12),
                                    margin: const EdgeInsets.symmetric(horizontal: 16),
                                    child: Center(
                                      child: Column(
                                        children: const [
                                          Icon(
                                            Icons.cloud_upload_outlined,
                                            size: 32,
                                            color: Color(0xFF38BDF8),
                                          ),
                                          SizedBox(height: 8),
                                          Text(
                                            'Upload client logo',
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF334155),
                                            ),
                                          ),
                                          SizedBox(height: 4),
                                          Text(
                                            'PNG, SVG, or JPG',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: Color(0xFF94A3B8),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                      ),
                      
                      // Section 3: Brand Presets (Always displayed inline)
                      Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.02),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: PresetSelector(
                          activePreset: config.presetName,
                          onPresetSelected: themeService.applyPreset,
                        ),
                      ),

                      // Section 4: Custom Brand Colors
                      ExpandableCard(
                        title: 'Custom Brand Colors',
                        icon: const Icon(Icons.palette_outlined, size: 18, color: Color(0xFF64748B)),
                        initialExpanded: false,
                        child: Column(
                          children: [
                            ColorInputField(
                              label: 'Primary Brand Color',
                              value: config.primaryColor,
                              onColorChanged: themeService.updatePrimaryColor,
                            ),
                            const SizedBox(height: 16),
                            ColorInputField(
                              label: 'Accent Brand Color',
                              value: config.accentColor,
                              onColorChanged: themeService.updateAccentColor,
                            ),
                          ],
                        ),
                      ),

                      // Section 5: Page Background
                      ExpandableCard(
                        title: 'Page Background',
                        icon: const Icon(Icons.style_outlined, size: 18, color: Color(0xFF64748B)),
                        initialExpanded: true,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ColorInputField(
                              label: 'Background Color',
                              value: config.pageBgColor,
                              onColorChanged: themeService.updatePageBgColor,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'The area behind all tiles. Overridden by a background image if set.',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF94A3B8),
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Section 6: Tile Backgrounds
                      ExpandableCard(
                        title: 'Tile Backgrounds',
                        icon: const Icon(Icons.grid_view_outlined, size: 18, color: Color(0xFF64748B)),
                        initialExpanded: true,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFF1F5F9)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: const [
                                  Text(
                                    'Left Small Tiles',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF334155),
                                    ),
                                  ),
                                  Spacer(),
                                  Text(
                                    '8 tiles',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              ColorInputField(
                                label: 'Color',
                                value: config.tileBgColor,
                                onColorChanged: themeService.updateTileBgColor,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Section 7: Typography
                      ExpandableCard(
                        title: 'Typography',
                        icon: const Icon(Icons.font_download_outlined, size: 18, color: Color(0xFF64748B)),
                        initialExpanded: false,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'FONT FAMILY',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: config.typography,
                                  isExpanded: true,
                                  icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF94A3B8)),
                                  items: ['Inter', 'Mulish', 'Outfit', 'Almarai', 'Roboto'].map((font) {
                                    return DropdownMenuItem<String>(
                                      value: font,
                                      child: Text(
                                        font,
                                        style: const TextStyle(fontSize: 14, color: Color(0xFF334155)),
                                      ),
                                    );
                                  }).toList(),
                                  onChanged: (val) {
                                    if (val != null) {
                                      themeService.updateTypography(val);
                                    }
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
