import { Component, Signal, WritableSignal, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import * as RecordRTC from 'recordrtc';
import { DomSanitizer } from '@angular/platform-browser';
import { HF_TOKEN } from '../constants/constants';
import { HfInference } from '@huggingface/inference';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'vocal-search-ln-2';
  listening = false;
  recorder?: RecordRTC.StereoAudioRecorder;
  url: WritableSignal<string> = signal('');
  inference = new HfInference(HF_TOKEN);

  res?: MediaStreamTrack[];
  transcription: WritableSignal<string> = signal('');
  translation: WritableSignal<string> = signal('');

  async activateMic() {
    this.listening = true;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.recorder = new RecordRTC.StereoAudioRecorder(stream, {
      mimeType: 'audio/wav',
    });
    this.recorder.record();
  }

  async stopRecording() {
    this.listening = false;
    if (this.recorder) {
      this.recorder.stop((res) => this.processBlob(res));
    }
  }

  async processBlob(blob: Blob) {
    this.url.set(URL.createObjectURL(blob));
    console.log(this.url);

    const resultFromHf = await this.inference.automaticSpeechRecognition({
      data: blob,
      model: 'openai/whisper-large-v3',
      //@ts-ignore
      parameters: {
        language: 'en',
      },
    });

    console.log(resultFromHf);

    this.transcription.set(resultFromHf.text);

    const translation = await this.inference.translation({
      model: 'facebook/nllb-200-distilled-600M',
      inputs: this.transcription(),
      //@ts-ignore
      parameters: {
        src_lang: 'eng-Latn',
        tgt_lang: 'ita_Latn',
      },
    });

    console.log(translation);

    this.translation.set(
      (translation as unknown as { translation_text: string }).translation_text
    );
    console.log(this.translation());
  }
}
