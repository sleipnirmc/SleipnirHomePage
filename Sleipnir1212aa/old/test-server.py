#!/usr/bin/env python3
import http.server
import socketserver
import os
import mimetypes

# Add proper MIME type for TTF files
mimetypes.add_type('font/ttf', '.ttf')
mimetypes.add_type('font/ttf', '.TTF')

# Custom handler to set correct MIME type and headers for font files
class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_my_headers()
        http.server.SimpleHTTPRequestHandler.end_headers(self)
    
    def send_my_headers(self):
        # Set correct MIME type and CORS headers for font files
        if self.path.endswith('.ttf') or self.path.endswith('.TTF'):
            self.send_header("Content-Type", "font/ttf")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "public, max-age=3600")
    
    def guess_type(self, path):
        mimetype = http.server.SimpleHTTPRequestHandler.guess_type(self, path)
        if path.endswith('.ttf') or path.endswith('.TTF'):
            return 'font/ttf'
        return mimetype

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print(f"Serving from: {os.getcwd()}")
    print("\nTest pages:")
    print(f"  http://localhost:{PORT}/index.html - Main website")
    print(f"  http://localhost:{PORT}/font-test.html - Font test page")
    print(f"  http://localhost:{PORT}/font-test-embedded.html - Embedded font test")
    print("\nPress Ctrl-C to stop the server")
    httpd.serve_forever()