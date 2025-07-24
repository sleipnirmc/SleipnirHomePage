#!/usr/bin/env python3
"""
Add login SVG icons to all login buttons that are missing them.
"""

import os
import re
from datetime import datetime

def add_login_svg_to_button(content):
    """Add SVG icon to login buttons that don't have one."""
    
    # Pattern to find login buttons without SVG
    pattern = r'(<a[^>]*class="[^"]*login-ghost[^"]*"[^>]*>)\s*(<span[^>]*>)'
    
    # SVG icon for login (user icon)
    svg_icon = '''
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>'''
    
    # Check if the button already has SVG
    if 'login-ghost' in content and 'login-ghost login-link' in content:
        # Find all login buttons
        matches = list(re.finditer(pattern, content, re.MULTILINE))
        
        for match in reversed(matches):  # Process in reverse to maintain positions
            start_pos = match.end(1)
            # Check if there's already an SVG after this position
            next_100_chars = content[start_pos:start_pos + 100]
            if '<svg' not in next_100_chars and 'viewBox' not in next_100_chars:
                # Insert SVG icon
                content = content[:start_pos] + svg_icon + '\n                        ' + content[start_pos:]
                print(f"  Added login SVG icon")
    
    return content

def process_html_files():
    """Process all HTML files to add login SVG icons."""
    html_files = [f for f in os.listdir('.') if f.endswith('.html') and not f.startswith('backup_')]
    
    updated_files = []
    
    for file in html_files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Check if file has login buttons
            if 'login-ghost' in content:
                print(f"\nProcessing {file}...")
                content = add_login_svg_to_button(content)
                
                if content != original_content:
                    # Create backup
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    backup_name = f"backup_{timestamp}_{file}"
                    with open(backup_name, 'w', encoding='utf-8') as f:
                        f.write(original_content)
                    
                    # Write updated content
                    with open(file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    updated_files.append(file)
                    print(f"✓ Updated {file} with login SVG icon")
                else:
                    print(f"  No changes needed for {file}")
        
        except Exception as e:
            print(f"✗ Error processing {file}: {str(e)}")
    
    print(f"\n{'='*50}")
    print(f"Login Icon Update Summary:")
    print(f"{'='*50}")
    print(f"Total files processed: {len(html_files)}")
    print(f"Files updated: {len(updated_files)}")
    if updated_files:
        print(f"\nUpdated files:")
        for file in updated_files:
            print(f"  - {file}")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    os.chdir('/Users/arnarfreyrerlingsson/Desktop/SleipnirHomePage/Sleipnir1212aa')
    print("Adding login SVG icons to buttons...")
    process_html_files()