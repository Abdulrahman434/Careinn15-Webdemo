import 'package:flutter/material.dart';

class PresetSelector extends StatelessWidget {
  final String activePreset;
  final ValueChanged<String> onPresetSelected;

  const PresetSelector({
    Key? key,
    required this.activePreset,
    required this.onPresetSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'BRAND PRESETS',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: Color(0xFF94A3B8),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildPresetBtn('dark', 'Dark', const Color(0xFF16274D), Colors.white),
            _buildPresetBtn('gold', 'Gold', const Color(0xFF8C6212), const Color(0xFFFCF8F2)),
            _buildPresetBtn('green', 'Green', const Color(0xFF1E5E2F), const Color(0xFFF2FAF4)),
            _buildPresetBtn('light', 'Light', const Color(0xFF4DA3FF), Colors.white),
          ],
        ),
      ],
    );
  }

  Widget _buildPresetBtn(String id, String label, Color color1, Color color2) {
    final isSelected = activePreset == id;
    
    return Builder(
      builder: (context) {
        return GestureDetector(
          onTap: () => onPresetSelected(id),
          child: Column(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  gradient: LinearGradient(
                    colors: [color1, color2],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    stops: const [0.5, 0.5],
                  ),
                ),
                child: isSelected
                    ? Center(
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black12,
                                blurRadius: 4,
                              )
                            ]
                          ),
                          child: Icon(
                            Icons.check,
                            size: 14,
                            color: color1,
                          ),
                        ),
                      )
                    : null,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: isSelected ? const Color(0xFF1E293B) : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        );
      }
    );
  }
}
