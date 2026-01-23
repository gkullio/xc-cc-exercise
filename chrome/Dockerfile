FROM kasmweb/chrome:1.15.0

# Create Chrome profile directory
USER root
RUN mkdir -p /home/kasm-user/.config/google-chrome/Default && \
    chown -R kasm-user:kasm-user /home/kasm-user/.config

# Copy bookmarks
COPY --chown=kasm-user:kasm-user Bookmarks /home/kasm-user/.config/google-chrome/Default/Bookmarks

# Set homepage via Preferences
COPY --chown=kasm-user:kasm-user Preferences /home/kasm-user/.config/google-chrome/Default/Preferences

USER 1000
