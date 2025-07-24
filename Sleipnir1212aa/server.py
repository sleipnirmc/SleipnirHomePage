#!/usr/bin/env python3
"""
Simple HTTP Server to serve index.html and other files
"""

import http.server
import socketserver
import os
import webbrowser
import threading
import time

# Configuration
PORT = 8080
DIRECTORY = "."  # Current directory, change this to serve files from a different location


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Add headers to prevent caching during development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


def open_browser():
    """Open the web browser after a short delay"""
    time.sleep(1)  # Wait for server to start
    webbrowser.open(f'http://localhost:{PORT}')


def start_server():
    """Start the HTTP server"""
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print(f"Serving files from: {os.path.abspath(DIRECTORY)}")
        print("Press Ctrl+C to stop the server")

        # Start browser in a separate thread
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    # Check if index.html exists in the current directory
    if not os.path.exists(os.path.join(DIRECTORY, "index.html")):
        print("Warning: index.html not found in the current directory")
        response = input("Do you want to continue anyway? (y/n): ")
        if response.lower() != 'y':
            exit()

    start_server()