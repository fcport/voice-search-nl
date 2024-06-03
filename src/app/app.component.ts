import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import * as RecordRTC from 'recordrtc';
import { DomSanitizer } from '@angular/platform-browser';

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
  url: any;

  private window: any = window;

  res?: MediaStreamTrack[];

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

  processBlob(blob: Blob) {
    this.url = URL.createObjectURL(blob);
    console.log(this.url);
  }
}
