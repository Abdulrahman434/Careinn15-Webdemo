import 'package:flutter/material.dart';

class ColorInputField extends StatefulWidget {
  final String label;
  final Color value;
  final ValueChanged<Color> onColorChanged;

  const ColorInputField({
    Key? key,
    required this.label,
    required this.value,
    required this.onColorChanged,
  }) : super(key: key);

  @override
  State<ColorInputField> createState() => _ColorInputFieldState();
}

class _ColorInputFieldState extends State<ColorInputField> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: _colorToHex(widget.value));
  }

  @override
  void didUpdateWidget(covariant ColorInputField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      final hex = _colorToHex(widget.value);
      if (_controller.text.toUpperCase() != hex.toUpperCase()) {
        _controller.text = hex;
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _colorToHex(Color color) {
    return color.value.toRadixString(16).substring(2).toUpperCase();
  }

  Color? _hexToColor(String hex) {
    try {
      if (hex.length == 6) {
        return Color(int.parse("FF$hex", radix: 16));
      } else if (hex.length == 8) {
        return Color(int.parse(hex, radix: 16));
      }
    } catch (_) {}
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label.toUpperCase(),
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: Color(0xFF94A3B8),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            GestureDetector(
              onTap: () {
                // Show simple dialog to select common colors
                showDialog(
                  context: context,
                  builder: (context) {
                    final colors = [
                      const Color(0xFF16274D),
                      const Color(0xFF1B2F5B),
                      const Color(0xFF8C6212),
                      const Color(0xFF1E5E2F),
                      const Color(0xFF4A90D9),
                      const Color(0xFFDFA62B),
                      const Color(0xFF3F9C35),
                      const Color(0xFF4DA3FF),
                      const Color(0xFFFFFFFF),
                      const Color(0xFFFCF8F2),
                      const Color(0xFFF2FAF4),
                      const Color(0xFF000000),
                    ];
                    return AlertDialog(
                      title: const Text('Select Color'),
                      content: SizedBox(
                        width: 250,
                        child: GridView.builder(
                          shrinkWrap: true,
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 4,
                            mainAxisSpacing: 8,
                            crossAxisSpacing: 8,
                          ),
                          itemCount: colors.length,
                          itemBuilder: (context, index) {
                            return GestureDetector(
                              onTap: () {
                                widget.onColorChanged(colors[index]);
                                Navigator.of(context).pop();
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: colors[index],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.black12),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    );
                  },
                );
              },
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: widget.value,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Text(
                      '#',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        color: Color(0xFF94A3B8),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        onChanged: (val) {
                          final color = _hexToColor(val.trim());
                          if (color != null) {
                            widget.onColorChanged(color);
                          }
                        },
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          color: Color(0xFF334155),
                          fontSize: 14,
                        ),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
