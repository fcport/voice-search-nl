import { Component, WritableSignal, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HfInference } from '@huggingface/inference';
import { ButtonModule } from 'primeng/button';
import * as RecordRTC from 'recordrtc';
import { HF_TOKEN, OPEN_AI_KEY } from '../constants/constants';
import {
  StringOutputParser,
  CommaSeparatedListOutputParser,
  StructuredOutputParser,
} from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

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

    this.parseData(this.transcription());
  }

  async parseData(phrase: string) {
    const model = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0,
      maxTokens: 700,
      verbose: false,
      openAIApiKey: OPEN_AI_KEY,
    });
    // const parser = StructuredOutputParser.fromNamesAndDescriptions({
    //   city: 'the name of the City to serach hotel into',
    //   arrival: 'the date from which the reservation will start',
    //   departure: 'the date from which the reservation will end',
    // });
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        city: z.string().describe('athe name of the City to serach hotel into'),
        arrival: z
          .string()
          .describe(
            'the date from which the reservation will start, if not expressed differently the date is within the current year, the date must be parsed to dd/MM/yyyy'
          ),
        departure: z
          .string()
          .describe(
            'the date from which the reservation will end, if not expressed differently the date is within the current year dd/MM/yyyy'
          ),
        // sources: z
        //   .array(z.string())
        //   .describe('sources used to answer the question, should be websites.'),
      })
    );

    const templatePrompt = ChatPromptTemplate.fromTemplate(
      `Extract informations from the following phrase, consider that it's about a reservation in a specific City.
      Formatting instructions : {formattingInstruction}. 
      Phrase: {phrase}`
    );

    const chain = templatePrompt.pipe(model).pipe(parser);

    const res = await chain.invoke({
      phrase: phrase,
      formattingInstruction: parser.getFormatInstructions(),
    });

    console.log(res);
  }
}
