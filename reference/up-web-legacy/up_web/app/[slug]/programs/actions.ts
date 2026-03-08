"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Program, ProgramWithTeams, CreateProgramInput, CreateTeamInput, Team } from "@/lib/types";

/**
 * Get workspace by slug
 */
export async function getWorkspaceBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Failed to fetch workspace:", error);
    return null;
  }

  return data;
}

/**
 * Get all programs for a workspace
 */
export async function getPrograms(workspaceId: string): Promise<ProgramWithTeams[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programs")
    .select(`
      *,
      teams(count),
      chat_sessions:teams(
        chat_sessions(count)
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch programs:", error);
    return [];
  }

  // Transform the data to include counts
  return (data || []).map((program) => ({
    ...program,
    team_count: program.teams?.[0]?.count || 0,
    session_count: program.chat_sessions?.reduce(
      (acc: number, team: { chat_sessions: { count: number }[] }) =>
        acc + (team.chat_sessions?.[0]?.count || 0),
      0
    ) || 0,
  }));
}

/**
 * Get a single program by ID with teams
 */
export async function getProgram(programId: string): Promise<ProgramWithTeams | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programs")
    .select(`
      *,
      teams(
        *,
        team_file_refs(*),
        chat_sessions(count)
      )
    `)
    .eq("id", programId)
    .single();

  if (error) {
    console.error("Failed to fetch program:", error);
    return null;
  }

  // Transform the data to include session counts and file_refs for each team
  const teams = data.teams?.map((team: Team & { team_file_refs: unknown[]; chat_sessions: { count: number }[] }) => ({
    ...team,
    file_refs: team.team_file_refs || [],
    session_count: team.chat_sessions?.[0]?.count || 0,
  }));

  return {
    ...data,
    teams,
    team_count: teams?.length || 0,
    session_count: teams?.reduce((acc: number, team: { session_count: number }) => acc + team.session_count, 0) || 0,
  };
}

/**
 * Create a new program
 */
export async function createProgram(
  workspaceId: string,
  input: CreateProgramInput
): Promise<{ success: boolean; program?: Program; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Create the program
  const { data, error } = await supabase
    .from("programs")
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      description: input.description || null,
      status: input.status || "active",
      google_drive_root_id: input.google_drive_root_id || null,
      google_drive_root_name: input.google_drive_root_name || null,
      google_drive_root_url: input.google_drive_root_url || null,
      cover_image_url: input.cover_image_url || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create program:", error);
    return { success: false, error: error.message };
  }

  // Get workspace slug for revalidation
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", workspaceId)
    .single();

  if (workspace) {
    revalidatePath(`/${workspace.slug}/programs`);
  }

  return { success: true, program: data };
}

/**
 * Update a program
 */
export async function updateProgram(
  programId: string,
  input: Partial<CreateProgramInput>
): Promise<{ success: boolean; program?: Program; error?: string }> {
  const supabase = await createClient();

  // Build update object with only defined values
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) updates.status = input.status;
  if (input.google_drive_root_id !== undefined) updates.google_drive_root_id = input.google_drive_root_id;
  if (input.google_drive_root_name !== undefined) updates.google_drive_root_name = input.google_drive_root_name;
  if (input.google_drive_root_url !== undefined) updates.google_drive_root_url = input.google_drive_root_url;
  if (input.cover_image_url !== undefined) updates.cover_image_url = input.cover_image_url;
  if (input.start_date !== undefined) updates.start_date = input.start_date;
  if (input.end_date !== undefined) updates.end_date = input.end_date;

  const { data, error } = await supabase
    .from("programs")
    .update(updates)
    .eq("id", programId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update program:", error);
    return { success: false, error: error.message };
  }

  // Get workspace slug for revalidation
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", data.workspace_id)
    .single();

  if (workspace) {
    revalidatePath(`/${workspace.slug}/programs`);
    revalidatePath(`/${workspace.slug}/programs/${programId}`);
  }

  return { success: true, program: data };
}

/**
 * Delete a program
 */
export async function deleteProgram(
  programId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get program first to find workspace
  const { data: program } = await supabase
    .from("programs")
    .select("workspace_id")
    .eq("id", programId)
    .single();

  const { error } = await supabase
    .from("programs")
    .delete()
    .eq("id", programId);

  if (error) {
    console.error("Failed to delete program:", error);
    return { success: false, error: error.message };
  }

  // Revalidate if we found the workspace
  if (program) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", program.workspace_id)
      .single();

    if (workspace) {
      revalidatePath(`/${workspace.slug}/programs`);
    }
  }

  return { success: true };
}

/**
 * Create a new team
 */
export async function createTeam(
  programId: string,
  input: CreateTeamInput
): Promise<{ success: boolean; team?: Team; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Create the team
  const { data, error } = await supabase
    .from("teams")
    .insert({
      program_id: programId,
      name: input.name,
      description: input.description || null,
      agent_type: input.agent_type,
      system_prompt: input.system_prompt || null,
      output_format_template: input.output_format_template || null,
      output_directory_id: input.output_directory_id || null,
      output_directory_name: input.output_directory_name || null,
      output_directory_url: input.output_directory_url || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create team:", error);
    return { success: false, error: error.message };
  }

  // Insert file refs if provided
  if (input.file_refs && input.file_refs.length > 0) {
    const fileRefsToInsert = input.file_refs.map((ref, index) => ({
      team_id: data.id,
      ref_type: ref.ref_type,
      drive_id: ref.drive_id,
      drive_name: ref.drive_name,
      include_subfolders: ref.include_subfolders,
      display_order: index,
    }));

    const { error: refError } = await supabase
      .from("team_file_refs")
      .insert(fileRefsToInsert);

    if (refError) {
      console.error("Failed to create team file refs:", refError);
      // Team was created, but file refs failed - don't fail the whole operation
    }
  }

  // Get program and workspace for revalidation
  const { data: program } = await supabase
    .from("programs")
    .select("workspace_id")
    .eq("id", programId)
    .single();

  if (program) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", program.workspace_id)
      .single();

    if (workspace) {
      revalidatePath(`/${workspace.slug}/programs/${programId}`);
    }
  }

  return { success: true, team: data };
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  input: Partial<CreateTeamInput>
): Promise<{ success: boolean; team?: Team; error?: string }> {
  const supabase = await createClient();

  // Build update object with only defined values
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.system_prompt !== undefined) updates.system_prompt = input.system_prompt;
  if (input.output_format_template !== undefined) updates.output_format_template = input.output_format_template;
  if (input.output_directory_id !== undefined) updates.output_directory_id = input.output_directory_id;
  if (input.output_directory_name !== undefined) updates.output_directory_name = input.output_directory_name;
  if (input.output_directory_url !== undefined) updates.output_directory_url = input.output_directory_url;

  const { data, error } = await supabase
    .from("teams")
    .update(updates)
    .eq("id", teamId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update team:", error);
    return { success: false, error: error.message };
  }

  // Revalidate paths
  const { data: program } = await supabase
    .from("programs")
    .select("workspace_id")
    .eq("id", data.program_id)
    .single();

  if (program) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", program.workspace_id)
      .single();

    if (workspace) {
      revalidatePath(`/${workspace.slug}/programs/${data.program_id}`);
      revalidatePath(`/${workspace.slug}/programs/${data.program_id}/teams/${teamId}`);
    }
  }

  return { success: true, team: data };
}

/**
 * Delete a team
 */
export async function deleteTeam(
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get team first to find program and workspace
  const { data: team } = await supabase
    .from("teams")
    .select("program_id")
    .eq("id", teamId)
    .single();

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (error) {
    console.error("Failed to delete team:", error);
    return { success: false, error: error.message };
  }

  // Revalidate if we found the program
  if (team) {
    const { data: program } = await supabase
      .from("programs")
      .select("workspace_id")
      .eq("id", team.program_id)
      .single();

    if (program) {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("slug")
        .eq("id", program.workspace_id)
        .single();

      if (workspace) {
        revalidatePath(`/${workspace.slug}/programs/${team.program_id}`);
      }
    }
  }

  return { success: true };
}

/**
 * Get team by ID
 */
export async function getTeam(teamId: string): Promise<Team | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select(`
      *,
      team_file_refs(*),
      chat_sessions(count)
    `)
    .eq("id", teamId)
    .single();

  if (error) {
    console.error("Failed to fetch team:", error);
    return null;
  }

  return {
    ...data,
    file_refs: data.team_file_refs,
    session_count: data.chat_sessions?.[0]?.count || 0,
  };
}
