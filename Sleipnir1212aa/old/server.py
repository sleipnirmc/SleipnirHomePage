#!/usr/bin/env python3
"""
Local development server for Sleipnir MC website
Serves static files with proper MIME types for testing
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import threading
import time

# Configuration
PORT = 8080
HOST = "localhost"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler with proper MIME types"""
    
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def guess_type(self, path):
        """Add custom MIME types for web fonts and other files"""
        mimetype = super().guess_type(path)
        if path.endswith('.ttf'):
            return 'font/ttf'
        elif path.endswith('.woff'):
            return 'font/woff'
        elif path.endswith('.woff2'):
            return 'font/woff2'
        elif path.endswith('.json'):
            return 'application/json'
        elif path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        return mimetype

def open_browser():
    """Open the default web browser after a short delay"""
    time.sleep(1)
    webbrowser.open(f'http://{HOST}:{PORT}')

def start_server():
    """Start the HTTP server"""
    # Change to the directory where the script is located
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    
    # Create the server
    with socketserver.TCPServer((HOST, PORT), MyHTTPRequestHandler) as httpd:
        print(f"\n{'='*50}")
        print(f"🔥 Sleipnir MC Development Server")
        print(f"{'='*50}")
        print(f"📁 Serving files from: {web_dir}")
        print(f"🌐 Server running at: http://{HOST}:{PORT}")
        print(f"📄 Homepage: http://{HOST}:{PORT}/index.html")
        print(f"{'='*50}")
        print(f"Press Ctrl+C to stop the server\n")
        
        # Open browser in a separate thread
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
        try:
            # Start serving requests
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")
            sys.exit(0)

if __name__ == "__main__":
    try:
        start_server()
    except OSError as e:
        if e.errno == 48:  # Port already in use
            print(f"\n❌ Error: Port {PORT} is already in use!")
            print(f"Try one of these solutions:")
            print(f"1. Close any other servers running on port {PORT}")
            print(f"2. Change the PORT variable in this script to a different number (e.g., 8080)")
        else:
            print(f"\n❌ Error: {e}")
        sys.exit(1)