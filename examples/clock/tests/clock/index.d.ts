import { IDL } from '@dfinity/candid';
import { Actor } from '@hadronous/pic';
import { _SERVICE } from '../../declarations/clock.did';

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: ({ IDL }: { IDL: IDL }) => IDL.Type[];

export declare type ClockService = _SERVICE;
export declare type ClockActor = Actor<ClockService>;
