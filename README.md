# Sulik 

A Voice Recognition Experiment. 

- Continuous listening mode (needs SSL enabled)
- Uses Wolphram Alpha as a definition API. 
- TODO: TTS using Ivona
  - currently uses http://tts-api.com/ which is *extremely* slow

Installation:

1. Create WOLFRAM_ALPHA_API_KEY env variable with your Wolfram API key.
2. Set up a self-signed SSL certificate, otherwise Chrome will ask for permission every time voice recognition is activated.

