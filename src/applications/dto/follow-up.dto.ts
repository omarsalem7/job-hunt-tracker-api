import { IsInt, IsOptional, Max, Min } from "class-validator";

export class SnoozeFollowUpDto {
    @IsInt()
    @Max(90)
    @Min(1)
    @IsOptional()
    days: number = 7;
}

export enum FollowUpStatus {
    NEEDS_FIRST_FOLLOW_UP = 'NEEDS_FIRST_FOLLOW_UP',
    NEEDS_SECOND_FOLLOW_UP = 'NEEDS_SECOND_FOLLOW_UP',
    STALE_GHOSTED = 'STALE_GHOSTED',
}
