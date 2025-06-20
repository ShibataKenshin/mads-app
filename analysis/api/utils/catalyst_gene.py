#=================================================================================================
# Project: CADS/MADS - An Integrated Web-based Visual Platform for Materials Informatics
#          Hokkaido University (2018)
#          Last Update: Q3 2023
# ________________________________________________________________________________________________
# Authors: Mikael Nicander Kuwahara (Lead Developer) [2021-]
#          Jun Fujima (Former Lead Developer) [2018-2021]
# ________________________________________________________________________________________________
# Description: Serverside (Django) rest api utils for the 'Analysis' page involving
#              'custom' components
# ------------------------------------------------------------------------------------------------
# Notes:  This is one of the REST API parts of the 'analysis' interface of the website that
#         allows serverside work for the 'custom' component.
# ------------------------------------------------------------------------------------------------
# References: logging libs
#=================================================================================================

#-------------------------------------------------------------------------------------------------
# Import required Libraries
#-------------------------------------------------------------------------------------------------
import logging
import math
import numpy as np
import pandas as pd
import json
import string
from nltk import edit_distance
import itertools

from scipy.cluster.hierarchy import dendrogram, linkage
from sklearn.preprocessing import StandardScaler
from sklearn.preprocessing import Normalizer
from sklearn.preprocessing import MaxAbsScaler
from sklearn.preprocessing import MinMaxScaler

logger = logging.getLogger(__name__)

#-------------------------------------------------------------------------------------------------


#-------------------------------------------------------------------------------------------------
def combination_wrapping(combination_list):
    all_combination = []


    for i in range(len(combination_list)):
                    
        for j in range(len(combination_list[0])):
                        
            if combination_list[i][j][0] == "":
                None
                # all_combination.append(combination_list[i][j][1])
                            
            elif combination_list[i][j][1] == "":
                None
                            
                # all_combination.append(combination_list[i][j][0])
                            
            else:

                all_combination.append(combination_list[i][j][0]+'/'+ combination_list[i][j][1])

    u, c = np.unique(np.array(all_combination), return_counts = True)

    df_count = pd.DataFrame({"combination":u, "Counts": c})

    df_count = df_count[df_count["combination"] != ""]

    df_count.sort_values(by = ["Counts"], ascending = False, inplace = True)

    df_count.reset_index(drop = True, inplace = True)



    return df_count

def get_catalyst_gene(data):

# ##########  data loading ###############################################################
    feature_columns = data['view']['settings']['featureColumns']
    fields = data["data"]['main']["schema"]["fields"]
    columns = [fields[a]["name"] for a in range(len(fields))]
    dataset = data["data"]["main"]['data']
    root_catalyst = data['view']['settings']['rootCatalyst']
    visualization = data['view']['settings']["visualizationMethod"]
    if 'dataOneHot' in data['view']['settings'].keys():
        data_onehot = data["view"]['settings']["dataOneHot"]
    else:
        data_onehot = False

    if 'clusteringMethod' in data['view']['settings'].keys():
        clustering_method = data["view"]['settings']["clusteringMethod"]
    else:
        clustering_method = "ward"

    result = {}
    result['featureColumns'] = feature_columns
    result['visualizationMethod'] = visualization
    result['rootCatalyst'] = root_catalyst
    
    df_original = pd.DataFrame(dataset, columns =columns)
    
    df = df_original.loc[:,feature_columns]

    #  check whether data has more than 3 valid columns  #
    df_concat =[]
    for column in feature_columns:
        numeric_column = pd.to_numeric(df[column], errors='coerce')
        df_concat.append(pd.DataFrame(numeric_column, columns = [column]))
    df_numerized = pd.concat(df_concat, axis = 1)
    df_numerized.dropna(axis = 1, inplace = True)
    if len(df_numerized.columns.values.tolist()) < 3:
        result['status'] = "error"
        result['detail'] = "More than 3 valid columns are required"
        return result

    else:
        #  Scaling the data if user specified the mehod  #
        if "preprocessingEnabled" in data['view']['settings'].keys():
            if data['view']['settings']["preprocessingEnabled"] == True:
                scaling = data['view']['settings']['preprocMethod']
                if scaling == 'StandardScaler':
                    scaler = StandardScaler()
                elif scaling == 'Normalizer':
                    scaler = Normalizer()
                elif scaling == 'MaxAbsScaler':
                    scaler = MaxAbsScaler()
                elif scaling == 'MinMaxScaler':
                    min_value = float(data['view']["settings"]["options"]["scaling"]["min"])
                    max_value = float(data['view']["settings"]["options"]["scaling"]["max"])
                    scaler = MinMaxScaler(feature_range=(min_value, max_value))
                scaled_df = pd.DataFrame(scaler.fit_transform(df_numerized), columns = df_numerized.columns)
            else:
                scaled_df = df_numerized
        else:
            scaled_df = df_numerized
        result["scaledData"]= scaled_df
        result["columnsForGene"] = scaled_df.columns

##################################################################################################################################################
#########   clustering   #########################################################################################################################
        array_data = scaled_df.values

        linkage_matrix = linkage(array_data, method = clustering_method)

        dendrogram_result = dendrogram(linkage_matrix, labels = df_original["Catalyst"].values.tolist(), no_plot=True)

        line_points = []

        for i in range(len(dendrogram_result['icoord'])):
            for j in range(len(dendrogram_result['icoord'][i])-1):
                
                start_x = dendrogram_result['icoord'][i][j]
                start_y = dendrogram_result['dcoord'][i][j]
                end_x = dendrogram_result['icoord'][i][j+1]
                end_y = dendrogram_result['dcoord'][i][j+1]
                
                line_points.append([start_y, start_x, end_y, end_x])

        result["clusteringData"] = line_points
        result["clusteringTicks"] = dendrogram_result['ivl']
        
    ##########################################################################################################################################################
    ##########   calculate under line area  ##################################################################################################################
        scaled_df_columns = scaled_df.columns.values.tolist()

        dict_height = {}


        for i, column in enumerate(scaled_df_columns):
            
            dict_height[column] = scaled_df.loc[:, column].values.astype(float)

        area_columns = [f"area{a}" for a in range(1, len(scaled_df_columns))]

        gene_columns = [f"gene{a}" for a in range(1, len(scaled_df_columns))]

        list_area = []

        list_df_areas = []

        for i, column in enumerate(scaled_df_columns[:-1]):
            
            array_left, array_right = dict_height[scaled_df_columns[i]], dict_height[scaled_df_columns[i+1]]
            
            area = (array_left + array_right) / 2

            list_area.append(area)
            list_df_areas.append(pd.DataFrame(area, columns = [area_columns[i]]))
            
        max_area = max([np.max(list_area[a]) for a in range(len(list_area))])
        min_area = min([np.min(list_area[a]) for a in range(len(list_area))])
        margin = (max_area - min_area) / 1000

        gene_criteion = np.linspace(min_area, max_area + margin, 16)

        genes = string.ascii_uppercase

        list_df_genes = []

        for i, area in enumerate(list_area):
                   
            digitized = np.digitize(area, bins = gene_criteion)
            
            array_gene = np.zeros_like(area).astype(object)
            
            for raw in range(array_gene.shape[0]):
                
                array_gene[raw] = genes[digitized[raw]-1]
            
            list_df_genes.append(pd.DataFrame(array_gene, columns = [gene_columns[i]]))
               
        df_area = pd.concat(list_df_areas, axis = 1)
        df_gene_area = pd.concat([df_original] + list_df_areas + list_df_genes, axis = 1)

        result['areaData'] = df_area

        array_for_gene = df_gene_area.loc[:, gene_columns].values

        df_gene = pd.DataFrame(np.sum(array_for_gene, axis = 1), columns = ["catalyst_gene"])

        df_gene_introduced = pd.concat([df_gene_area, df_gene], axis = 1)

        #result['dfGeneIntroduced'] = df_gene_introduced

############################################################################################################################################################
################  returning the heatmap data    ############################################################################################################
################  sort rows to match the clustering result  ###############################################################################################

        df_for_heatmap = df_gene_introduced.copy()

        catalysts = []
        df_for_heatmap = df_for_heatmap.iloc[dendrogram_result['leaves'], :]
        df_for_heatmap.reset_index(drop= True, inplace = True)
        heat_map_columns = [a for a in df_for_heatmap.columns if "area" in a]
        array_heatmap = df_for_heatmap.loc[:, heat_map_columns].values

        yData = []
        xData = []
        heatVal = []
        for i in range(len(df_for_heatmap.index)):

            catalysts.append(df_for_heatmap["Catalyst"].values.tolist()[i])

            for j in range(len(heat_map_columns)):
                xData.append(j)
                yData.append(i)
                heatVal.append(array_heatmap[i, j])  

        result['heatmapData'] = {}
        result['heatmapData']['xData'] = xData
        result['heatmapData']['yData'] = yData
        result['heatmapData']['heatVal'] = heatVal
        result['heatmapData']['xTicks'] = heat_map_columns
        result['heatmapData']['yTicks'] = catalysts

#############################################################################################################################################################
##########  edit_distance and sort data by distance from the root_catalyst_gene  ############################################################################

        root_index = df_gene_introduced[df_gene_introduced["Catalyst"] == root_catalyst].index[0]

        df_root_raw = df_gene_introduced[df_gene_introduced["Catalyst"] == root_catalyst].copy()

        df_root_raw["distance"] = np.array(0)

        root_gene = df_gene_introduced[df_gene_introduced["Catalyst"] == root_catalyst]["catalyst_gene"].values

        array_distance = np.zeros_like(df_gene_introduced.iloc[:, 0])

        array_distance[root_index] = 0

        for index in df_gene_introduced.index.tolist():
            
            compare_catalyst = df_gene_introduced.loc[index,"Catalyst"]
            
            compare_gene = df_gene_introduced[df_gene_introduced["Catalyst"] == compare_catalyst]["catalyst_gene"].values
            
            array_distance[index] = edit_distance(root_gene[0], compare_gene[0], substitution_cost=1, transpositions=False)

        df_distance = pd.DataFrame(array_distance, columns = ["distance"])

        df_compare_distance_introduced = pd.concat([df_gene_introduced, df_distance], axis = 1)

        ########  ensure that the root catalyst come to the top  ###################
        df_compare_distance_introduced.drop(index=root_index, axis=0, inplace=True)

        df_compare_distance_introduced.sort_values(by = ["distance"], ascending = [True], inplace = True)

        df_distance_introduced = pd.concat([df_root_raw, df_compare_distance_introduced], axis = 0)
        
        df_distance_introduced.reset_index(drop = True, inplace = True)

        result['dfDistanceIntroduced'] = df_distance_introduced

        #df_similar_gene_catalyst = df_distance_introduced[df_distance_introduced["distance"] <= distance_border]["Catalyst"].values.tolist()

        #result['similarGeneCatalyst'] = df_similar_gene_catalyst

        area_columns = [a for a in df_distance_introduced.columns if "area" in a]

        dict_area_cat =  {}

        for i, catalyst in enumerate(df_distance_introduced["Catalyst"]):

            df_cat = df_distance_introduced.iloc[i, :]

            dict_area_cat[catalyst] = df_cat[area_columns].values.tolist()

        result["parallelData"] = dict_area_cat

###########  common pattern finding    ############################################
        dict_pattern_df = {}

        if data_onehot:

            first_component = data["view"]['settings']["componentFirstColumn"]
            last_component = data["view"]['settings']["componentLastColumn"]

            first_index = min(columns.index(first_component), columns.index(last_component))
            last_index = max(columns.index(first_component), columns.index(last_component))     

            for distance in range(np.max(df_distance_introduced["distance"])+1):

                df_similar_gene = df_distance_introduced[df_distance_introduced['distance'] <= distance]
                df_compo = df_similar_gene.iloc[:, first_index:last_index+1]
                # df_compo.fillna(value = "0", inplace = True)

                array_atoms = np.zeros_like(df_compo.values).astype('object')

                combination_list =[]

                for raw in df_compo.index:
                
                    for i, material in enumerate(df_compo.columns):
                    
                        if (df_compo.iloc[raw, i] == "0") | (df_compo.iloc[raw, i] == 0):
                            
                            array_atoms[raw, i] = ""
                        else:
                            
                            array_atoms[raw, i] = str(material)
                
                    combination_list.append(list(itertools.combinations(array_atoms[raw], 2)))
           
                dict_pattern_df[distance] = combination_wrapping(combination_list)

            result['patternCounts'] = dict_pattern_df

        else:
            componentColumns = data["view"]['settings']["compomentColumns"]

            for distance in range(np.max(df_distance_introduced["distance"])+1):
            
                df_similar_gene = df_distance_introduced[df_distance_introduced['distance'] <= distance]

                df_compo = df_similar_gene.loc[:, componentColumns]
                df_compo.fillna(value = '0', inplace = True)

                array_atoms = np.zeros_like(df_compo.values).astype('object')

                combination_list =[]

                for raw in df_compo.index:
                
                    for i, material in enumerate(df_compo.columns):
                    
                        if (df_compo.iloc[raw, i] == "0") | (df_compo.iloc[raw, i] == 0) :

                            array_atoms[raw, i] = ""

                        else:
                            array_atoms[raw, i] = str(df_compo.iloc[raw, i])

                    combination_list.append(list(itertools.combinations(array_atoms[raw], 2)))

                dict_pattern_df[distance] = combination_wrapping(combination_list)

            result['patternCounts'] = dict_pattern_df
        
    return result
#-------------------------------------------------------------------------------------------------
