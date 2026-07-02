export interface SpeechToTextProvider {
  readonly name: string;
  transcribe(input: { audio: Uint8Array; mimeType: string; fileName: string }): Promise<string>;
}

export interface TextToSpeechProvider {
  readonly name: string;
  synthesize(input: { text: string }): Promise<{ audio: Uint8Array; contentType: string }>;
}

export interface VoiceProviders {
  speechToText: SpeechToTextProvider;
  textToSpeech: TextToSpeechProvider;
}
